import sys
import json
import numpy as np
import librosa
import base64
import io
import soundfile as sf
from scipy import signal

# Piano note frequencies (A0 to C8 - 88 keys)
def get_piano_notes():
    """Generate all 88 piano key frequencies"""
    # A0 is MIDI note 21, C8 is MIDI note 108
    notes = []
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    for midi_num in range(21, 109):  # 88 piano keys
        freq = 440 * (2 ** ((midi_num - 69) / 12))  # A4 = 440Hz = MIDI 69
        octave = (midi_num - 12) // 12
        note_name = note_names[midi_num % 12]
        notes.append({
            'name': f"{note_name}{octave}",
            'freq': freq,
            'midi': midi_num
        })
    
    return notes

PIANO_NOTES = get_piano_notes()

def freq_to_note(frequency):
    """Convert frequency to closest piano note"""
    if frequency <= 0:
        return None
    
    # Find closest note
    min_diff = float('inf')
    closest_note = None
    
    for note in PIANO_NOTES:
        diff = abs(note['freq'] - frequency)
        if diff < min_diff:
            min_diff = diff
            closest_note = note
    
    # Check if frequency is close enough (within 50 cents / half a semitone)
    if closest_note and min_diff < closest_note['freq'] * 0.03:  # ~3% tolerance
        return closest_note
    
    return None


# (Your get_piano_notes() and freq_to_note() functions remain the same)

class StreamingNoteDetector:
    def __init__(self, sample_rate=22050, buffer_duration=1.5, min_db=-38):
        self.sample_rate = sample_rate
        self.buffer_duration = buffer_duration
        self.min_db = min_db
        self.max_buffer_samples = int(sample_rate * buffer_duration)
        self.audio_buffer = np.array([], dtype=np.float32)
        self.detected_notes = []
        self.last_processed_time = 0
        self.total_audio_duration = 0
        
        # ## NEW: Define a fixed size for analysis frames.
        # This is the key to stability. 4096 samples = ~185ms.
        self.analysis_frame_size = 4096
        self.min_segment_size = 2048

    def add_audio_chunk(self, audio_chunk):
        self.audio_buffer = np.concatenate([self.audio_buffer, audio_chunk])
        chunk_duration = len(audio_chunk) / self.sample_rate
        self.total_audio_duration += chunk_duration

        if len(self.audio_buffer) > self.max_buffer_samples:
            excess = len(self.audio_buffer) - self.max_buffer_samples
            self.audio_buffer = self.audio_buffer[excess:]
            buffer_start_time = self.total_audio_duration - self.buffer_duration
            if self.last_processed_time < buffer_start_time:
                self.last_processed_time = buffer_start_time

        new_notes = self._detect_notes_in_buffer()
        return new_notes

    def _detect_notes_in_buffer(self):
        if len(self.audio_buffer) < self.analysis_frame_size:
            return []

        buffer_start_time = max(0, self.total_audio_duration - self.buffer_duration)

        try:
            onset_frames = librosa.onset.onset_detect(
                y=self.audio_buffer, sr=self.sample_rate,
                units='frames', backtrack=True, delta=0.25, wait=4
            )
        except Exception:
            return []

        if not onset_frames.any():
            return []
            
        onset_times = librosa.frames_to_time(onset_frames, sr=self.sample_rate)
        onset_times = onset_times + buffer_start_time
        new_notes = []

        for i, start_time in enumerate(onset_times):
            # Define the duration based on the next onset, or the end of the buffer
            end_time = onset_times[i+1] if i+1 < len(onset_times) else self.total_audio_duration

            if start_time < self.last_processed_time:
                continue

            start_sample = int((start_time - buffer_start_time) * self.sample_rate)
            
            # ## NEW: Create a fixed-size frame for analysis
            # We grab a snapshot right after the note starts.
            if start_sample + self.analysis_frame_size > len(self.audio_buffer):
                continue # Not enough audio data after this onset yet

            analysis_frame = self.audio_buffer[start_sample : start_sample + self.analysis_frame_size]

            rms = np.mean(librosa.feature.rms(y=analysis_frame))
            if rms < 0.01: continue
            
            db = librosa.amplitude_to_db(np.array([rms]), ref=np.max)[0]
            if db < self.min_db: continue

            spectral_flatness = np.mean(librosa.feature.spectral_flatness(y=analysis_frame))
            if spectral_flatness > 0.05: continue
                
            detected_freq = self._detect_pitch_robust(analysis_frame)
            if not detected_freq: continue
            
            note = freq_to_note(detected_freq)
            if not note: continue

            note_data = {
                'note': note['name'], 'midi': note['midi'], 'frequency': float(detected_freq),
                'start_time': float(start_time), 'duration': float(end_time - start_time),
                'volume_db': float(db)
            }
            
            if not self._handle_note_logic(note_data):
                new_notes.append(note_data)
                self.detected_notes.append(note_data)
        
        if len(new_notes) > 0:
            self.last_processed_time = new_notes[-1]['start_time']

        return new_notes

    def _detect_pitch_robust(self, segment):
        # All analysis functions now use a fixed n_fft/frame_length because the input is a fixed size
        n_fft = 2048
        try:
            f0_yin = librosa.yin(
                segment, fmin=librosa.note_to_hz('A1'), fmax=librosa.note_to_hz('C7'),
                sr=self.sample_rate, frame_length=n_fft
            )
            f0_yin = f0_yin[f0_yin > 0]
            if len(f0_yin) == 0: return None
            
            median_freq_yin = float(np.median(f0_yin))
            
            # Secondary check with HPS
            D = np.abs(librosa.stft(segment, n_fft=n_fft))
            harmonics = 5
            D_hps = D.copy()
            for h in range(2, harmonics + 1):
                downsampled = D[::h]
                D_hps[:len(downsampled)] *= downsampled
            freqs = librosa.fft_frequencies(sr=self.sample_rate, n_fft=n_fft)
            f0_hps = freqs[np.argmax(D_hps)]

            # Combine results
            ratio = f0_hps / median_freq_yin if median_freq_yin > 0 else 0
            if 0.85 < ratio < 1.15: return (0.5 * median_freq_yin + 0.5 * f0_hps)
            return median_freq_yin
        except Exception:
            return None
    
    def _handle_note_logic(self, new_note):
        if not self.detected_notes:
            return False
        
        last_note = self.detected_notes[-1]
        time_diff = new_note['start_time'] - last_note['start_time']
        
        # Simple refractory period: if a new note is detected too soon, ignore it.
        if time_diff < 0.1: # 100ms
            return True
            
        return False

    def get_all_notes(self):
        return self.detected_notes
    

def decode_audio_chunk(base64_audio):
    """
    Decode base64 audio data to numpy array
    Expects WAV format
    """
    try:
        # Decode base64
        audio_bytes = base64.b64decode(base64_audio)
        
        # Load with soundfile
        audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
        
        # Convert to float32
        audio_data = audio_data.astype(np.float32)
        
        return audio_data, sample_rate
    
    except Exception as e:
        print(json.dumps({'error': f'Decode error: {str(e)}'}), flush=True)
        return None, None


def main():
    """
    Main streaming loop
    Reads JSON messages from stdin, processes audio chunks, outputs results
    """
    # Initialize with same parameters as recording version
    detector = StreamingNoteDetector(sample_rate=22050, buffer_duration=3.0, min_db=-40)
    
    # Send ready signal
    print(json.dumps({'status': 'ready'}), flush=True)
    
    # Read from stdin line by line
    for line in sys.stdin:
        try:
            data = json.loads(line.strip())
            
            if data.get('type') == 'audio_chunk':
                # Decode audio
                audio_chunk, sample_rate = decode_audio_chunk(data['audio'])
                
                if audio_chunk is None:
                    print(json.dumps({'error': 'Failed to decode audio'}), flush=True)
                    continue
                
                # Resample if needed
                if sample_rate != detector.sample_rate:
                    audio_chunk = librosa.resample(
                        audio_chunk, 
                        orig_sr=sample_rate, 
                        target_sr=detector.sample_rate
                    )
                
                # Process chunk
                new_notes = detector.add_audio_chunk(audio_chunk)
                
                # Send results
                response = {
                    'type': 'notes',
                    'notes': new_notes,
                    'total_notes': len(detector.detected_notes),
                    'buffer_duration': float(len(detector.audio_buffer) / detector.sample_rate)
                }
                
                print(json.dumps(response), flush=True)
            
            elif data.get('type') == 'get_all_notes':
                # Return all detected notes
                response = {
                    'type': 'all_notes',
                    'notes': detector.get_all_notes(),
                    'total_notes': len(detector.detected_notes)
                }
                print(json.dumps(response), flush=True)
            
            elif data.get('type') == 'reset':
                # Reset detector
                detector = StreamingNoteDetector(sample_rate=22050, buffer_duration=3.0, min_db=-40)
                print(json.dumps({'status': 'reset'}), flush=True)
        
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON'}), flush=True)
        except Exception as e:
            print(json.dumps({'error': str(e)}), flush=True)


if __name__ == '__main__':
    main()
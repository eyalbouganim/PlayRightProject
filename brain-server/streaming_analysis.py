import sys
import json
import numpy as np
import librosa
import base64
import io
import soundfile as sf

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


class StreamingNoteDetector:
    def __init__(self, sample_rate=22050, buffer_duration=3.0, min_db=-30):
        """
        Initialize streaming note detector
        
        sample_rate: Audio sample rate
        buffer_duration: How many seconds of audio to keep in buffer
        min_db: Minimum volume threshold in decibels (default -30dB)
        """
        self.sample_rate = sample_rate
        self.buffer_duration = buffer_duration
        self.min_db = min_db
        
        # Rolling audio buffer (keeps last N seconds)
        self.max_buffer_samples = int(sample_rate * buffer_duration)
        self.audio_buffer = np.array([], dtype=np.float32)
        
        # Track detected notes to avoid duplicates
        self.detected_notes = []
        self.last_processed_time = 0  # Track what we've already processed
        self.total_audio_duration = 0  # Track total time processed
        
    def add_audio_chunk(self, audio_chunk):
        """
        Add new audio chunk to buffer and detect notes
        
        audio_chunk: numpy array of audio samples
        Returns: list of newly detected notes
        """
        # Append new chunk to buffer
        self.audio_buffer = np.concatenate([self.audio_buffer, audio_chunk])
        
        # Update total duration
        chunk_duration = len(audio_chunk) / self.sample_rate
        self.total_audio_duration += chunk_duration
        
        # Trim buffer if too long (keep only last buffer_duration seconds)
        if len(self.audio_buffer) > self.max_buffer_samples:
            excess = len(self.audio_buffer) - self.max_buffer_samples
            self.audio_buffer = self.audio_buffer[excess:]
            # Update last_processed_time when we trim
            buffer_start_time = self.total_audio_duration - self.buffer_duration
            if self.last_processed_time < buffer_start_time:
                self.last_processed_time = buffer_start_time
        
        # Detect notes in current buffer
        new_notes = self._detect_notes_in_buffer()
        
        return new_notes
    
    def _detect_notes_in_buffer(self):
        """Detect notes in the current buffer"""
        if len(self.audio_buffer) < 2048:  # Need minimum samples
            return []
        
        # Calculate buffer start time (relative to total audio)
        buffer_start_time = max(0, self.total_audio_duration - self.buffer_duration)
        
        # Detect note onsets (when notes start)
        try:
            onset_frames = librosa.onset.onset_detect(
                y=self.audio_buffer,
                sr=self.sample_rate,
                units='frames',
                backtrack=True,
                wait=10,
                pre_max=20,
                post_max=20,
                pre_avg=100,
                post_avg=100,
                delta=0.2
            )
        except Exception as e:
            return []
        
        if len(onset_frames) == 0:
            return []
        
        onset_times = librosa.frames_to_time(onset_frames, sr=self.sample_rate)
        
        # Convert to absolute time
        onset_times = onset_times + buffer_start_time
        
        # Add end time
        onset_times = np.append(onset_times, self.total_audio_duration)
        
        new_notes = []
        
        # Analyze each segment between onsets
        for i in range(len(onset_times) - 1):
            start_time = onset_times[i]
            end_time = onset_times[i + 1]
            
            # Skip if we've already processed this time range
            if start_time < self.last_processed_time:
                continue
            
            # Calculate sample indices relative to buffer
            start_time_in_buffer = start_time - buffer_start_time
            end_time_in_buffer = end_time - buffer_start_time
            
            start_sample = int(start_time_in_buffer * self.sample_rate)
            end_sample = int(end_time_in_buffer * self.sample_rate)
            
            # Ensure indices are within buffer bounds
            start_sample = max(0, start_sample)
            end_sample = min(len(self.audio_buffer), end_sample)
            
            if start_sample >= end_sample or end_sample - start_sample < 512:
                continue
            
            segment = self.audio_buffer[start_sample:end_sample]
            
            # Check volume/amplitude - skip if too quiet
            rms = librosa.feature.rms(y=segment)[0]
            avg_rms = np.mean(rms)
            db = librosa.amplitude_to_db(np.array([avg_rms]))[0]
            
            if db < self.min_db:  # Too quiet, skip
                continue
            
            # Detect pitch in this segment using YIN algorithm
            try:
                f0 = librosa.yin(segment, fmin=27.5, fmax=4186, sr=self.sample_rate)
            except Exception as e:
                continue
            
            # Get median frequency (more stable than mean)
            valid_f0 = f0[f0 > 0]
            if len(valid_f0) == 0:
                continue
                
            median_freq = np.median(valid_f0)
            
            # Convert to note
            note = freq_to_note(median_freq)
            
            if note:
                note_data = {
                    'note': note['name'],
                    'midi': note['midi'],
                    'frequency': float(median_freq),
                    'start_time': float(start_time),
                    'duration': float(end_time - start_time),
                    'volume_db': float(db)
                }
                
                # Check if this is a duplicate or continuation of last note
                if not self._is_duplicate_note(note_data):
                    new_notes.append(note_data)
                    self.detected_notes.append(note_data)
        
        # Update last processed time to avoid re-processing
        if len(onset_times) > 1:
            self.last_processed_time = onset_times[-2]  # Second to last (last is end time)
        
        return new_notes
    
    def _is_duplicate_note(self, new_note, time_threshold=0.05):
        """
        Check if note is duplicate of recently detected note
        Only merge if notes are VERY close in time (within 50ms)
        This allows repeated notes to be detected separately
        """
        if not self.detected_notes:
            return False
        
        last_note = self.detected_notes[-1]
        
        # Calculate the gap between the end of last note and start of new note
        gap = new_note['start_time'] - (last_note['start_time'] + last_note['duration'])
        
        # Only merge if same note AND gap is tiny (< 50ms)
        # This means it's truly a continuation, not a repeated note
        if (new_note['note'] == last_note['note'] and 
            gap >= 0 and gap < time_threshold):
            # Update the last note's duration instead of adding new one
            self.detected_notes[-1]['duration'] = new_note['start_time'] + new_note['duration'] - last_note['start_time']
            return True
        
        return False
    
    def get_all_notes(self):
        """Return all detected notes so far"""
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
    detector = StreamingNoteDetector(sample_rate=22050, buffer_duration=3.0, min_db=-30)
    
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
                detector = StreamingNoteDetector(sample_rate=22050, buffer_duration=3.0, min_db=-30)
                print(json.dumps({'status': 'reset'}), flush=True)
        
        except json.JSONDecodeError:
            print(json.dumps({'error': 'Invalid JSON'}), flush=True)
        except Exception as e:
            print(json.dumps({'error': str(e)}), flush=True)


if __name__ == '__main__':
    main()
import librosa
import numpy as np

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


def detect_notes(audio_data, sample_rate, min_db=-30):
    """
    Detect notes over time using onset detection and pitch tracking
    Returns list of detected notes with timestamps
    
    min_db: Minimum volume threshold in decibels (default -40dB)
    """
    # Detect note onsets (when notes start)
    onset_frames = librosa.onset.onset_detect(
        y=audio_data, 
        sr=sample_rate, 
        units='frames',
        backtrack=True,
        wait=10,
        pre_max=20,
        post_max=20,
        pre_avg=100,
        post_avg=100,
        delta=0.2
    )
    onset_times = librosa.frames_to_time(onset_frames, sr=sample_rate)
    
    # Add end time
    onset_times = np.append(onset_times, len(audio_data) / sample_rate)
    
    detected_notes = []
    
    # Analyze each segment between onsets
    for i in range(len(onset_times) - 1):
        start_time = onset_times[i]
        end_time = onset_times[i + 1]
        
        # Extract segment
        start_sample = int(start_time * sample_rate)
        end_sample = int(end_time * sample_rate)
        segment = audio_data[start_sample:end_sample]
        
        if len(segment) < 512:
            continue
        
        # Check volume/amplitude - skip if too quiet
        rms = librosa.feature.rms(y=segment)[0]
        avg_rms = np.mean(rms)
        db = librosa.amplitude_to_db(np.array([avg_rms]))[0]
        
        if db < min_db:  # Too quiet, skip
            continue
        
        # Detect pitch in this segment using YIN algorithm
        f0 = librosa.yin(segment, fmin=27.5, fmax=4186, sr=sample_rate)
        
        # Get median frequency (more stable than mean)
        median_freq = np.median(f0[f0 > 0]) if len(f0[f0 > 0]) > 0 else 0
        
        # Convert to note
        note = freq_to_note(median_freq)
        
        if note:
            detected_notes.append({
                'note': note['name'],
                'midi': note['midi'],
                'frequency': median_freq,
                'start_time': start_time,
                'duration': end_time - start_time,
                'volume_db': float(db)  # Include volume for debugging
            })
    
    # Merge consecutive identical notes that are close together
    merged_notes = merge_consecutive_notes(detected_notes)
    
    return merged_notes


def merge_consecutive_notes(notes, time_threshold=0.15):
    """
    Merge consecutive identical notes that are close in time
    """
    if not notes:
        return []
    
    merged = [notes[0].copy()]
    
    for note in notes[1:]:
        last_note = merged[-1]
        
        # If same note and close in time, extend duration
        if (note['note'] == last_note['note'] and 
            note['start_time'] - (last_note['start_time'] + last_note['duration']) < time_threshold):
            # Extend the last note's duration
            merged[-1]['duration'] = note['start_time'] + note['duration'] - last_note['start_time']
        else:
            # Different note or too far apart, add as new
            merged.append(note.copy())
    
    return merged

def calculate_score(detected_notes, target_notes=None):
    """
    Calculate score based on detected notes
    For now, just returns basic info. You'll expand this to compare with target.
    """
    if not detected_notes:
        return 0
    
    # Placeholder scoring - you'll improve this later
    # For now, just return 100 if notes were detected
    return 100 if len(detected_notes) > 0 else 0

def analyze_music(file_path):
    """
    Main analysis function
    """
    try:
        # Load audio file (converts to mono automatically)
        y, sr = librosa.load(file_path, sr=22050)
        
        # Detect notes
        notes = detect_notes(y, sr)
        
        # Calculate score
        score = calculate_score(notes)
        
        # Format output
        notes_simple = [
            {
                'note': n['note'],
                'start': round(n['start_time'], 2),
                'duration': round(n['duration'], 2)
            }
            for n in notes
        ]
        
        return {
            'score': score,
            'notes': notes_simple,
            'total_notes': len(notes)
        }
    
    except Exception as e:
        return {
            'error': str(e),
            'score': 0,
            'notes': []
        }
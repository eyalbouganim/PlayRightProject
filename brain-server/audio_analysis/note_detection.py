"""
Note detection from audio files
"""

import sys
import numpy as np
import librosa
from pitch_detection import detect_pitch_robust, freq_to_note


def detect_notes_improved(audio_path, sample_rate=22050, min_db=-38):
    """
    Improved note detection
    """
    print(f"--- Loading audio file: {audio_path} ---", file=sys.stderr)
    
    try:
        y, sr = librosa.load(audio_path, sr=sample_rate)
        duration = librosa.get_duration(y=y, sr=sr)
        print(f"--- Audio loaded (duration: {duration:.2f}s) ---", file=sys.stderr)
    except Exception as e:
        print(f"--- Error loading audio: {e} ---", file=sys.stderr)
        return []
    
    print("--- Detecting notes ---", file=sys.stderr)
    
    # Fixed frame size for analysis (same as streaming)
    analysis_frame_size = 4096
    
    # Detect onsets with improved parameters
    try:
        onset_frames = librosa.onset.onset_detect(
            y=y, 
            sr=sr,
            units='frames', 
            backtrack=True, # according to loudest point in note
            delta=0.25,  # Sensitivity threshold
            wait=4       # Minimum frames between onsets
        )
    except Exception as e:
        print(f"--- Onset detection error: {e} ---", file=sys.stderr)
        return []
    
    if len(onset_frames) == 0:
        print("--- No onsets detected ---", file=sys.stderr)
        return []
    
    # Converting start of notes with frames to seconds
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)
    detected_notes = []
    
    print(f"--- Found {len(onset_times)} potential onsets ---", file=sys.stderr)
    
    for i, start_time in enumerate(onset_times):
        # Define end time based on next onset or end of audio
        end_time = onset_times[i+1] if i+1 < len(onset_times) else duration
        
        start_sample = int(start_time * sr)
        
        # Use fixed-size frame for analysis (key improvement from streaming)
        if start_sample + analysis_frame_size > len(y):
            continue
        
        analysis_frame = y[start_sample : start_sample + analysis_frame_size]
        
        # Energy check
        rms = np.mean(librosa.feature.rms(y=analysis_frame))
        if rms < 0.01:
            continue
        
        # Volume check
        db = librosa.amplitude_to_db(np.array([rms]), ref=np.max)[0]
        if db < min_db:
            continue
        
        # Spectral flatness check (many freqs or major one) (filter out noise)
        spectral_flatness = np.mean(librosa.feature.spectral_flatness(y=analysis_frame))
        if spectral_flatness > 0.05:  # Too noisy
            continue
        
        # Detect pitch using robust method
        detected_freq = detect_pitch_robust(analysis_frame, sr)
        if not detected_freq:
            continue
        
        # Convert to note
        note = freq_to_note(detected_freq)
        if not note:
            continue
        
        note_data = {
            'note': note['name'],
            'midi': note['midi'],
            'frequency': float(detected_freq),
            'start_time': float(start_time),
            'duration': float(end_time - start_time),
            'volume_db': float(db)
        }
        
        detected_notes.append(note_data)
    
    # Merge duplicate notes (notes within 100ms with same pitch)
    merged_notes = []
    for note in detected_notes:
        if not merged_notes:
            merged_notes.append(note)
            continue
        
        last_note = merged_notes[-1]
        time_diff = note['start_time'] - last_note['start_time']
        
        # If same note within 100ms, skip (refractory period)
        if time_diff < 0.1 and note['note'] == last_note['note']:
            continue
        
        merged_notes.append(note)
    
    print(f"--- Detected {len(merged_notes)} notes after filtering ---", file=sys.stderr)
    
    return merged_notes
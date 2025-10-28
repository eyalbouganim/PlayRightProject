"""
Note alignment and comparison for performance evaluation
"""

import sys
import numpy as np


def normalize_note_name(note_name):
    """
    Normalize note names to handle enharmonic equivalents ('bemol' --> 'diez')
    (e.g., C# = Db, D# = Eb, etc.)
    """
    # Mapping of flats to sharps
    flat_to_sharp = {
        'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
    }
    
    # Extract note and octave
    if len(note_name) >= 2:
        if 'b' in note_name:
            note_part = note_name[:-1]  # e.g., "Db4" -> "Db"
            octave = note_name[-1]
            if note_part in flat_to_sharp:
                return flat_to_sharp[note_part] + octave
    
    return note_name


def align_and_compare(detected_notes, expected_notes, timing_tolerance=0.3):
    """
    Align detected notes with expected notes and calculate accuracy
    Uses relative timing (rhythm) and enforces sequential order
    Allows wrong notes to be inserted, but continues sequence when correct note is found
    """
    if not expected_notes:
        return {
            'pitch_accuracy': 0.0,
            'timing_accuracy': 0.0,
            'overall_score': 0.0,
            'details': []
        }
    
    n_detected = len(detected_notes)
    n_expected = len(expected_notes)
    
    if n_detected == 0:
        details = []
        for exp in expected_notes:
            # No notes detection, so I'll classify every note as missing
            # (Adding this to details of performance)
            details.append({
                'expected_note': exp['note'],
                'expected_time': round(exp['start_time'], 3),
                'detected_note': None,
                'detected_time': None,
                'pitch_correct': False,
                'timing_correct': False,
                'status': 'missed'
            })
        
        return {
            'pitch_accuracy': 0.0,
            'timing_accuracy': 0.0,
            'overall_score': 0.0,
            'total_expected': n_expected,
            'total_detected': 0,
            'correct_notes': 0,
            'wrong_notes': 0,
            'on_time_notes': 0,
            'details': details
        }
    
    # Matching the tempo of the performance and the sheet music
    # Step 1: Normalize both sequences to start at time 0
    detected_start = detected_notes[0]['start_time']
    expected_start = expected_notes[0]['start_time']
    
    normalized_detected = []
    for note in detected_notes:
        normalized_detected.append({
            'note': note['note'],
            'start_time': note['start_time'] - detected_start,
            'duration': note.get('duration', 0),
            'original_time': note['start_time']
        })
    
    normalized_expected = []
    for note in expected_notes:
        normalized_expected.append({
            'note': note['note'],
            'start_time': note['start_time'] - expected_start,
            'duration': note.get('duration', 0),
            'original_time': note['start_time']
        })
    
    print(f"--- Normalized to start at 0 (detected started at {detected_start:.3f}s) ---", file=sys.stderr)
    
    # Step 2: Calculate relative intervals (time between consecutive notes)
    def get_intervals(notes):
        intervals = []
        for i in range(len(notes) - 1):
            interval = notes[i + 1]['start_time'] - notes[i]['start_time']
            intervals.append(interval)
        return intervals
    
    detected_intervals = get_intervals(normalized_detected)
    expected_intervals = get_intervals(normalized_expected)
    
    # Step 3: Find the tempo scale factor using all intervals
    if len(detected_intervals) > 0 and len(expected_intervals) > 0:
        # Only 10 intervals, relevant for if the tempo will change in the rest of the song
        num_intervals = min(len(detected_intervals), len(expected_intervals), 10)
        tempo_ratios = []
        
        for i in range(num_intervals):
            # Safety check for extremely short intervals which are probably irrelevant
            if expected_intervals[i] > 0.05:
                ratio = detected_intervals[i] / expected_intervals[i]
                tempo_ratios.append(ratio)
        
        if tempo_ratios:
            # I chose median rather than average to not take mistakes into account
            tempo_scale = np.median(tempo_ratios)
            print(f"--- Detected tempo scale: {tempo_scale:.3f}x (1.0 = perfect tempo) ---", file=sys.stderr)
        else:
            tempo_scale = 1.0
    else:
        tempo_scale = 1.0
    
    # Step 4: Scale expected timings to match detected tempo
    # 'Stretches' the sheet music to match tempo of performance :)
    scaled_expected = []
    for note in normalized_expected:
        scaled_expected.append({
            'note': note['note'],
            'start_time': note['start_time'] * tempo_scale,
            'duration': note['duration'] * tempo_scale,
            'original_time': note['original_time']
        })
    
    # Step 5: SEQUENTIAL MATCHING WITH WRONG NOTE INSERTION
    # The actual comparison between results - the important part
    all_results = []
    correct_pitch = 0
    correct_timing = 0
    timing_mistakes = 0  # Count timing issues on CORRECT notes only
    wrong_notes_count = 0  # Count individual wrong notes played
    
    expected_idx = 0
    last_matched_detected_idx = -1
    
    for detected_idx in range(n_detected):
        det = normalized_detected[detected_idx]
        det_note = normalize_note_name(det['note'])
        
        # Check if we've finished the expected sequence
        if expected_idx >= n_expected:
            # Extra notes after song is done - WRONG NOTE
            wrong_notes_count += 1
            
            all_results.append({
                'expected_note': None,
                'expected_position': None,
                'detected_note': det['note'],
                'detected_position': detected_idx,
                'detected_time_normalized': round(float(det['start_time']), 3),
                'pitch_correct': False,
                'timing_correct': False,
                'status': 'extra'
            })
            continue
        
        # Get current expected note
        exp = scaled_expected[expected_idx]
        exp_note = normalize_note_name(exp['note'])
        
        # Check if this detected note matches the current expected note
        if det_note == exp_note:
            # MATCH! This is the correct note
            correct_pitch += 1
            
            # Check timing ONLY for CORRECT notes
            timing_correct = False
            # Time diff between deteced note and expected note
            time_diff = abs(exp['start_time'] - det['start_time'])
            
            if expected_idx > 0 and last_matched_detected_idx >= 0:
                # Compare interval from previous matched note
                prev_exp_idx = expected_idx - 1
                prev_det_idx = last_matched_detected_idx
                
                expected_interval = exp['start_time'] - scaled_expected[prev_exp_idx]['start_time']
                detected_interval = det['start_time'] - normalized_detected[prev_det_idx]['start_time']
                
                if expected_interval > 0.05:
                    interval_ratio = detected_interval / expected_interval
                    rhythm_tolerance = 0.3  # 30% rhythm tolerance (for timing mistakes)
                    if 1 - rhythm_tolerance <= interval_ratio <= 1 + rhythm_tolerance:
                        timing_correct = True
                    else:
                        timing_mistakes += 1  # Timing was off for this correct note
                else:
                    # Very close notes, check absolute timing
                    if time_diff <= timing_tolerance * tempo_scale * 2:
                        timing_correct = True
                    else:
                        timing_mistakes += 1
            else:
                # First note - just check absolute timing
                if time_diff <= timing_tolerance * tempo_scale * 3:
                    timing_correct = True
                else:
                    timing_mistakes += 1
            
            if timing_correct:
                correct_timing += 1
            
            status = 'perfect' if timing_correct else 'correct_rhythm_off'
            
            all_results.append({
                'expected_note': exp['note'],
                'expected_position': expected_idx,
                'detected_note': det['note'],
                'detected_position': detected_idx,
                'expected_time_scaled': round(float(exp['start_time']), 3),
                'detected_time_normalized': round(float(det['start_time']), 3),
                'time_difference': round(float(time_diff), 3),
                'pitch_correct': True,
                'timing_correct': bool(timing_correct),
                'status': status
            })
            
            # Move to next expected note
            expected_idx += 1
            last_matched_detected_idx = detected_idx
        
        else:
            # WRONG NOTE! This doesn't match the expected note
            wrong_notes_count += 1
            
            # DO NOT check timing for wrong notes - just skip them
            
            all_results.append({
                'expected_note': exp['note'],
                'expected_position': expected_idx,
                'detected_note': det['note'],
                'detected_position': detected_idx,
                'expected_time_scaled': round(float(exp['start_time']), 3),
                'detected_time_normalized': round(float(det['start_time']), 3),
                'time_difference': round(float(abs(exp['start_time'] - det['start_time'])), 3),
                'pitch_correct': False,
                'timing_correct': False,
                'status': 'wrong_note'
            })
    
    # Check for missed notes (expected notes that were never played)
    missed_count = n_expected - correct_pitch
    for exp_idx in range(expected_idx, n_expected):
        exp = scaled_expected[exp_idx]
        # Missed notes count as timing mistakes (note never came at the right time)
        timing_mistakes += 1
        
        all_results.append({
            'expected_note': exp['note'],
            'expected_position': exp_idx,
            'detected_note': None,
            'detected_position': None,
            'expected_time_scaled': round(float(exp['start_time']), 3),
            'pitch_correct': False,
            'timing_correct': False,
            'status': 'missed'
        })
    
    # Sort results by detected position - missed notes are last
    all_results.sort(key=lambda x: x['detected_position'] if x['detected_position'] is not None else 9999)
    
    # PITCH ACCURACY CALCULATION:
    # Start at 0, +1/n for each correct note, -1/n for each wrong note
    pitch_score = correct_pitch - wrong_notes_count  # Net score
    pitch_accuracy = (pitch_score / n_expected) * 100
    pitch_accuracy = max(0.0, pitch_accuracy)  # Floor at 0%
    
    # TIMING ACCURACY CALCULATION (as specified):
    # Only check timing of correct notes
    # timing_mistakes already counts only timing issues on correct notes + missed notes
    timing_accuracy = max(0, ((n_expected - timing_mistakes) / n_expected) * 100)
    
    # Overall score - according to 0.6 part for pitch, 0.4 for timing (less important)
    overall_score = (pitch_accuracy * 0.6 + timing_accuracy * 0.4)
    
    print(f"--- Correct Notes: {correct_pitch}/{n_expected} ---", file=sys.stderr)
    print(f"--- Wrong Notes: {wrong_notes_count} ---", file=sys.stderr)
    print(f"--- Missed Notes: {missed_count} ---", file=sys.stderr)
    print(f"--- Pitch Score: {pitch_score} (correct - wrong) ---", file=sys.stderr)
    print(f"--- Timing Mistakes (on correct notes only): {timing_mistakes} ---", file=sys.stderr)
    print(f"--- Pitch Accuracy: {pitch_accuracy:.2f}% ---", file=sys.stderr)
    print(f"--- Timing Accuracy: {timing_accuracy:.2f}% ---", file=sys.stderr)
    
    return {
        'pitch_accuracy': round(pitch_accuracy, 2),
        'timing_accuracy': round(timing_accuracy, 2),
        'rhythm_accuracy': round(timing_accuracy, 2),
        'overall_score': round(overall_score, 2),
        'total_expected': int(n_expected),
        'total_detected': int(n_detected),
        'correct_notes': int(correct_pitch),
        'wrong_notes': int(wrong_notes_count),
        'timing_mistakes': int(timing_mistakes),
        'missed_notes': int(missed_count),
        'on_time_notes': int(correct_timing),
        'tempo_scale': round(float(tempo_scale), 3),
        'details': all_results
    }
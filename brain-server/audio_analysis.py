import sys
import json
import numpy as np
import librosa
import soundfile as sf
from scipy.optimize import linear_sum_assignment
import xml.etree.ElementTree as ET
import argparse

def make_json_serializable(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, dict):
        return {key: make_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(item) for item in obj]
    else:
        return obj

# Piano note frequencies (A0 to C8 - 88 keys)
def get_piano_notes():
    """Generate all 88 piano key frequencies"""
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


def detect_pitch_robust(segment, sample_rate, n_fft=2048):
    """
    Robust pitch detection using YIN + HPS (Harmonic Product Spectrum)
    """
    try:
        # YIN algorithm for fundamental frequency
        f0_yin = librosa.yin(
            segment, 
            fmin=librosa.note_to_hz('A1'), 
            fmax=librosa.note_to_hz('C7'),
            sr=sample_rate, 
            frame_length=n_fft
        )
        f0_yin = f0_yin[f0_yin > 0]
        
        if len(f0_yin) == 0:
            return None
        
        median_freq_yin = float(np.median(f0_yin))
        
        # Secondary check with HPS
        D = np.abs(librosa.stft(segment, n_fft=n_fft))
        harmonics = 5
        D_hps = D.copy()
        
        for h in range(2, harmonics + 1):
            downsampled = D[::h]
            D_hps[:len(downsampled)] *= downsampled
        
        freqs = librosa.fft_frequencies(sr=sample_rate, n_fft=n_fft)
        f0_hps = freqs[np.argmax(D_hps)]
        
        # Combine results
        ratio = f0_hps / median_freq_yin if median_freq_yin > 0 else 0
        if 0.85 < ratio < 1.15:
            return (0.5 * median_freq_yin + 0.5 * f0_hps)
        
        return median_freq_yin
    
    except Exception as e:
        print(f"--- Pitch detection error: {e} ---", file=sys.stderr)
        return None


def detect_notes_improved(audio_path, sample_rate=22050, min_db=-38):
    """
    Improved note detection using techniques from streaming script
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
            backtrack=True, 
            delta=0.25,  # Sensitivity threshold
            wait=4       # Minimum frames between onsets
        )
    except Exception as e:
        print(f"--- Onset detection error: {e} ---", file=sys.stderr)
        return []
    
    if len(onset_frames) == 0:
        print("--- No onsets detected ---", file=sys.stderr)
        return []
    
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
        
        # Spectral flatness check (filter out noise)
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


def parse_musicxml(xml_path, tempo=120):
    """
    Parse MusicXML file to extract expected notes with timing
    """
    print(f"--- Parsing MusicXML: {xml_path} ---", file=sys.stderr)
    
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception as e:
        print(f"--- Error parsing MusicXML: {e} ---", file=sys.stderr)
        return []
    
    # Find namespace
    ns = {'': 'http://www.musicxml.org/xsd/musicxml'}
    if root.tag.startswith('{'):
        ns_url = root.tag.split('}')[0].strip('{')
        ns = {'': ns_url}
    
    expected_notes = []
    current_time = 0.0
    divisions = 1  # Default divisions per quarter note
    
    # Iterate through all parts
    for part in root.findall('.//part', ns) or root.findall('.//part'):
        current_time = 0.0
        
        for measure in part.findall('.//measure', ns) or part.findall('.//measure'):
            # Check for divisions (timing resolution)
            attributes = measure.find('.//attributes', ns) or measure.find('.//attributes')
            if attributes is not None:
                div_elem = attributes.find('.//divisions', ns) or attributes.find('.//divisions')
                if div_elem is not None and div_elem.text:
                    divisions = int(div_elem.text)
            
            # Process notes
            for note_elem in measure.findall('.//note', ns) or measure.findall('.//note'):
                # Check if it's a rest
                if note_elem.find('.//rest', ns) is not None or note_elem.find('.//rest') is not None:
                    duration_elem = note_elem.find('.//duration', ns) or note_elem.find('.//duration')
                    if duration_elem is not None and duration_elem.text:
                        duration_divisions = int(duration_elem.text)
                        duration_quarters = duration_divisions / divisions
                        duration_seconds = (duration_quarters * 60.0) / tempo
                        current_time += duration_seconds
                    continue
                
                # Get pitch
                pitch_elem = note_elem.find('.//pitch', ns) or note_elem.find('.//pitch')
                if pitch_elem is None:
                    continue
                
                step_elem = pitch_elem.find('.//step', ns) or pitch_elem.find('.//step')
                octave_elem = pitch_elem.find('.//octave', ns) or pitch_elem.find('.//octave')
                alter_elem = pitch_elem.find('.//alter', ns) or pitch_elem.find('.//alter')
                
                if step_elem is None or octave_elem is None:
                    continue
                
                step = step_elem.text
                octave = octave_elem.text
                alter = alter_elem.text if alter_elem is not None else None
                
                # Build note name
                note_name = step
                if alter == '1':
                    note_name += '#'
                elif alter == '-1':
                    note_name += 'b'
                
                note_name += octave
                
                # Get duration
                duration_elem = note_elem.find('.//duration', ns) or note_elem.find('.//duration')
                if duration_elem is not None and duration_elem.text:
                    duration_divisions = int(duration_elem.text)
                    duration_quarters = duration_divisions / divisions
                    duration_seconds = (duration_quarters * 60.0) / tempo
                else:
                    duration_seconds = 0.5  # Default
                
                expected_notes.append({
                    'note': note_name,
                    'start_time': current_time,
                    'duration': duration_seconds
                })
                
                # Check if it's a chord (doesn't advance time)
                chord_elem = note_elem.find('.//chord', ns) or note_elem.find('.//chord')
                if chord_elem is None:
                    current_time += duration_seconds
    
    print(f"--- Parsed {len(expected_notes)} expected notes from MusicXML ---", file=sys.stderr)
    return expected_notes


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
        num_intervals = min(len(detected_intervals), len(expected_intervals), 10)
        tempo_ratios = []
        
        for i in range(num_intervals):
            if expected_intervals[i] > 0.05:
                ratio = detected_intervals[i] / expected_intervals[i]
                tempo_ratios.append(ratio)
        
        if tempo_ratios:
            tempo_scale = np.median(tempo_ratios)
            print(f"--- Detected tempo scale: {tempo_scale:.3f}x (1.0 = perfect tempo) ---", file=sys.stderr)
        else:
            tempo_scale = 1.0
    else:
        tempo_scale = 1.0
    
    # Step 4: Scale expected timings to match detected tempo
    scaled_expected = []
    for note in normalized_expected:
        scaled_expected.append({
            'note': note['note'],
            'start_time': note['start_time'] * tempo_scale,
            'duration': note['duration'] * tempo_scale,
            'original_time': note['original_time']
        })
    
    # Step 5: SEQUENTIAL MATCHING WITH WRONG NOTE INSERTION
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
            time_diff = abs(exp['start_time'] - det['start_time'])
            
            if expected_idx > 0 and last_matched_detected_idx >= 0:
                # Compare interval from previous matched note
                prev_exp_idx = expected_idx - 1
                prev_det_idx = last_matched_detected_idx
                
                expected_interval = exp['start_time'] - scaled_expected[prev_exp_idx]['start_time']
                detected_interval = det['start_time'] - normalized_detected[prev_det_idx]['start_time']
                
                if expected_interval > 0.05:
                    interval_ratio = detected_interval / expected_interval
                    rhythm_tolerance = 0.35  # 35% tolerance
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
                # First note - just check absolute timing (more lenient)
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
    
    # Sort results by detected position
    all_results.sort(key=lambda x: x['detected_position'] if x['detected_position'] is not None else 9999)
    
    # PITCH ACCURACY CALCULATION (as specified):
    # Start at 0, +1/n for each correct note, -1/n for each wrong note
    pitch_score = correct_pitch - wrong_notes_count  # Net score
    pitch_accuracy = (pitch_score / n_expected) * 100
    pitch_accuracy = max(0.0, pitch_accuracy)  # Floor at 0%
    
    # TIMING ACCURACY CALCULATION (as specified):
    # Only check timing of correct notes
    # timing_mistakes already counts only timing issues on correct notes + missed notes
    timing_accuracy = max(0, ((n_expected - timing_mistakes) / n_expected) * 100)
    
    # Overall score
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


def normalize_note_name(note_name):
    """
    Normalize note names to handle enharmonic equivalents
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


def main():
    """
    Main analysis function
    """
    # Use argparse for proper command-line argument parsing
    parser = argparse.ArgumentParser(description='Analyze audio performance')
    parser.add_argument('--audio-path', required=True, help='Path to audio file')
    parser.add_argument('--song-id', required=True, help='Song identifier')
    parser.add_argument('--musicxml-path', default=None, help='Path to MusicXML file')
    parser.add_argument('--tempo', type=int, default=120, help='Tempo in BPM')
    parser.add_argument('--timing-tolerance', type=float, default=0.3, help='Timing tolerance in seconds')
    
    args = parser.parse_args()
    
    audio_path = args.audio_path
    song_id = args.song_id
    tempo = args.tempo
    timing_tolerance = args.timing_tolerance
    
    # Determine the MusicXML path based on song_id
    musicxml_path = None
    if song_id:
        if song_id == 'default':
            # Path to the default MusicXML file within the brain-server directory
            musicxml_path = './assets/twinkle_twinkle.musicxml'
            print(f"--- Using default MusicXML for comparison: {musicxml_path} ---", file=sys.stderr)
        else:
            # Construct path for user-uploaded songs
            musicxml_path = f'../node-server/uploads/musicxml/{song_id}.musicxml'
            print(f"--- Using user-uploaded MusicXML for comparison: {musicxml_path} ---", file=sys.stderr)

    detected_notes = detect_notes_improved(audio_path, sample_rate=22050, min_db=-38)
    
    output = {
        'playedNotes': detected_notes,
        'totalNotes': len(detected_notes)
    }
    
    # Compare with MusicXML if provided
    if musicxml_path:
        print("--- Comparing with MusicXML ---", file=sys.stderr)
        expected_notes = parse_musicxml(musicxml_path, tempo)
        
        if expected_notes:
            comparison = align_and_compare(detected_notes, expected_notes, timing_tolerance)
            output['comparison'] = comparison
            
            print(f"--- Pitch Accuracy: {comparison['pitch_accuracy']}% ---", file=sys.stderr)
            print(f"--- Timing Accuracy: {comparison['timing_accuracy']}% ---", file=sys.stderr)
            print(f"--- Overall Score: {comparison['overall_score']}% ---", file=sys.stderr)
    
    # Make sure everything is JSON serializable
    output = make_json_serializable(output)
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
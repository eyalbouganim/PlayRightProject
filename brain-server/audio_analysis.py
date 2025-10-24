import librosa
import numpy as np
import json
import sys
import argparse

# --- (get_piano_notes, PIANO_NOTES, freq_to_note remain the same) ---
def get_piano_notes():
    """Generate all 88 piano key frequencies"""
    notes = []
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    for midi_num in range(21, 109):
        freq = 440 * (2 ** ((midi_num - 69) / 12))
        octave = (midi_num - 12) // 12
        note_name = note_names[midi_num % 12]
        notes.append({'name': f"{note_name}{octave}", 'freq': freq, 'midi': midi_num})
    return notes

PIANO_NOTES = get_piano_notes()

def freq_to_note(frequency):
    """Convert frequency to closest piano note"""
    if frequency <= 0: return None
    min_diff = float('inf')
    closest_note = None
    for note in PIANO_NOTES:
        diff = abs(note['freq'] - frequency)
        if diff < min_diff:
            min_diff = diff
            closest_note = note
    # ~3% tolerance (50 cents)
    if closest_note and min_diff < closest_note['freq'] * 0.03:
        return closest_note
    return None
# --- (End of unchanged functions) ---


def detect_notes(audio_data, sample_rate, min_db=-30):
    """
    Detect notes over time using onset detection and pitch tracking.
    Returns a list of dictionaries, each containing note details.
    """
    try:
        # Use slightly more sensitive onset detection for full analysis
        onset_frames = librosa.onset.onset_detect(
            y=audio_data, sr=sample_rate, units='frames',
            backtrack=True, delta=0.2, wait=3 # Faster wait time
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=sample_rate)
        # Add the end time of the audio as the final boundary
        onset_times = np.append(onset_times, len(audio_data) / sample_rate)
    except Exception as e:
         print(f"Error during onset detection: {e}", file=sys.stderr)
         return []

    detected_notes = []
    min_segment_length_samples = 512 # Minimum samples for reliable analysis

    for i in range(len(onset_times) - 1):
        start_time = onset_times[i]
        end_time = onset_times[i + 1]
        start_sample = int(start_time * sample_rate)
        end_sample = int(end_time * sample_rate)
        segment = audio_data[start_sample:end_sample]

        if len(segment) < min_segment_length_samples:
            continue # Skip segments that are too short

        try:
            # Check volume - skip quiet segments
            rms = np.mean(librosa.feature.rms(y=segment))
            if rms == 0: continue # Avoid log(0) errors
            db = librosa.amplitude_to_db(np.array([rms]), ref=np.max)[0]
            if db < min_db:
                continue

            # Detect pitch using YIN
            # Dynamically adjust frame_length for short segments
            frame_length = min(2048, 2**int(np.floor(np.log2(len(segment)))))
            if frame_length < 512: frame_length = 512 # Ensure minimum frame length

            if len(segment) < frame_length: continue # Final check

            f0 = librosa.yin(segment, fmin=27.5, fmax=4186, sr=sample_rate, frame_length=frame_length)
            valid_f0 = f0[f0 > 0] # Filter out unvoiced frames (where f0 is 0 or NaN)
            if len(valid_f0) == 0:
                continue # Skip if no valid pitch detected

            median_freq = float(np.median(valid_f0)) # Get the most stable frequency
            note = freq_to_note(median_freq)

            if note:
                detected_notes.append({
                    'note': note['name'],
                    'midi': note['midi'],
                    'frequency': median_freq,
                    'start_time': start_time,
                    'duration': end_time - start_time,
                    'volume_db': float(db)
                })
        except Exception as e:
            # Log errors during segment analysis but continue
            print(f"Error analyzing segment {i} ({start_time:.2f}s - {end_time:.2f}s): {e}", file=sys.stderr)
            continue

    merged_notes = merge_consecutive_notes(detected_notes)
    return merged_notes


def merge_consecutive_notes(notes, time_threshold=0.08): # Slightly smaller threshold
    """Merge consecutive identical notes if the gap is very small."""
    if not notes: return []
    merged = [notes[0].copy()]
    for current_note in notes[1:]:
        last_merged_note = merged[-1]
        # Calculate gap between end of last note and start of current note
        gap = current_note['start_time'] - (last_merged_note['start_time'] + last_merged_note['duration'])

        # Merge if same note and gap is small (allowing slight overlap)
        if current_note['note'] == last_merged_note['note'] and -0.02 <= gap < time_threshold:
            # Extend the duration of the last merged note
            merged[-1]['duration'] = (current_note['start_time'] + current_note['duration']) - last_merged_note['start_time']
            # Optionally update volume to the max of the two segments
            merged[-1]['volume_db'] = max(last_merged_note['volume_db'], current_note['volume_db'])
        else:
            # Different note or gap too large, add as a new note
            merged.append(current_note.copy())
    return merged


# ## Main execution block ##
if __name__ == "__main__":
    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(description='Analyze an audio file for musical notes.')
    parser.add_argument('--audio-path', required=True, help='Path to the audio file (WAV).')
    parser.add_argument('--song-id', required=True, help='Identifier for the song.')
    args = parser.parse_args()

    output = {} # Dictionary for final JSON output

    # --- Run Analysis ---
    try:
        print(f"--- Loading audio file: {args.audio_path} ---", file=sys.stderr)
        y, sr = librosa.load(args.audio_path, sr=22050, mono=True)
        print(f"--- Audio loaded (duration: {len(y)/sr:.2f}s) ---", file=sys.stderr)

        print("--- Detecting notes ---", file=sys.stderr)
        notes = detect_notes(y, sr)
        print(f"--- Detected {len(notes)} notes after merging ---", file=sys.stderr)

        # --- Format Output ---
        # Create a list containing only the note name, start time, and duration
        played_notes_output = [
            {
                'note': n['note'],
                'start': round(n['start_time'], 3),
                'duration': round(n['duration'], 3)
            }
            for n in notes
        ]

        # Structure the final output
        output = {
            'songId': args.song_id,
            'playedNotes': played_notes_output, # The list of detected notes
            'totalNotesDetected': len(played_notes_output)
        }

    # Error Handling
    except Exception as e:
        error_message = f"Error during analysis: {str(e)}"
        print(error_message, file=sys.stderr) # Print error to stderr
        output = {'error': error_message}

    # Print the result dictionary as a JSON string to stdout
    print(json.dumps(output, indent=2))
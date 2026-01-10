"""
brain-server/polyphonic_verification.py

The Core Engine for Polyphonic Assessment.
Replaces "Blind Detection" with "Score-Aware Verification".

Workflow:
1.  Load Audio & MusicXML.
2.  Transcribe Audio -> Note Events (using your Trained ML Model).
3.  Align & Verify -> Match Played Events vs. Expected Events.
4.  Grade -> Generate Score & Feedback.
"""

import os
import sys
import numpy as np
import librosa
import tensorflow as tf

# Try to import your existing parser. 
# Adjust path if your folder structure differs.
try:
    from audio_analysis.musicxml_parser import parse_musicxml
except ImportError:
    # Fallback if running as script from brain-server/
    sys.path.append(os.path.join(os.path.dirname(__file__), 'audio_analysis'))
    from musicxml_parser import parse_musicxml

# --- ML CONFIGURATION (Must match training/predict_file.py) ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
NUM_KEYS = 88
THRESHOLD = 0.5  # Confidence threshold

# --- CUSTOM LOSS (Required to load model) ---
def class_weighted_loss(y_true, y_pred):
    bce = tf.keras.backend.binary_crossentropy(y_true, y_pred)
    weight_vector = y_true * 9.0 + 1.0 
    weighted_bce = weight_vector * bce
    return tf.reduce_mean(weighted_bce)

class PolyphonicTranscriber:
    """
    The 'Ears' of the system.
    Uses your Deep Learning model to convert raw audio into a list of note events.
    """
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = self._load_model()

    def _load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model file not found: {self.model_path}")
        
        print(f"--- Loading ML Model: {os.path.basename(self.model_path)} ---")
        try:
            # Try loading with custom loss logic
            return tf.keras.models.load_model(
                self.model_path, 
                custom_objects={'class_weighted_loss': class_weighted_loss}
            )
        except Exception as e:
            print(f"Note: Custom loss load failed ({e}). Attempting standard load...")
            return tf.keras.models.load_model(self.model_path, compile=False)

    def extract_features(self, audio_path):
        """
        Convert audio to CQT spectrogram (Input for the AI).
        Matches logic from 'predict_file.py'.
        """
        # Load audio (resample to 16kHz)
        y, _ = librosa.load(audio_path, sr=SR)
        
        # CQT Transform
        cqt = librosa.cqt(
            y, sr=SR, hop_length=HOP_LENGTH, 
            fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12
        )
        
        # Clean up noise (The "top_db=30" trick from your predict file)
        cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max, top_db=30)
        
        # Normalize to 0-1
        features = (cqt_db + 30.0) / 30.0
        features = np.clip(features, 0, 1).T
        return features

    def raw_preds_to_events(self, prediction_matrix):
        """
        Convert the model's 'piano roll' matrix into discrete Note objects.
        Returns: List of {note, midi, start_time, duration}
        """
        events = []
        frames_per_sec = SR / HOP_LENGTH
        
        # Iterate through every piano key (column)
        for midi_idx in range(NUM_KEYS):
            midi_num = midi_idx + MIN_MIDI
            
            # Get activation curve for this key
            # > THRESHOLD converts probabilities (0.1, 0.9) to Boolean (False, True)
            active_frames = prediction_matrix[:, midi_idx] > THRESHOLD
            
            # Find where notes start and end
            # diff() gives 1 at start, -1 at end
            diffs = np.diff(active_frames.astype(int), prepend=0)
            starts = np.where(diffs == 1)[0]
            ends = np.where(diffs == -1)[0]
            
            # Handle cut-off notes at the end of audio
            if len(ends) < len(starts):
                ends = np.append(ends, len(active_frames))
            
            for s, e in zip(starts, ends):
                # Filter out tiny blips (< 100ms) to reduce noise
                duration_frames = e - s
                if duration_frames < (0.1 * frames_per_sec): 
                    continue
                
                start_time = s / frames_per_sec
                duration = duration_frames / frames_per_sec
                
                events.append({
                    'note': librosa.midi_to_note(midi_num), # e.g., "C4"
                    'midi': midi_num,
                    'start_time': float(start_time),
                    'duration': float(duration),
                    'velocity': 100 # Placeholder (model doesn't detect volume yet)
                })
        
        # Sort by time
        events.sort(key=lambda x: x['start_time'])
        return events

    def transcribe(self, audio_path):
        """Public method to go from File -> Notes"""
        features = self.extract_features(audio_path)
        
        # Add batch dimension (1, Time, 88)
        input_batch = np.expand_dims(features, axis=0)
        
        # Predict
        preds = self.model.predict(input_batch, verbose=0)[0]
        
        return self.raw_preds_to_events(preds)


class PolyphonicVerifier:
    """
    The 'Brain' of the system.
    Compares what the ML heard (Played) vs what was in the file (Expected).
    """
    def verify(self, played_notes, expected_notes, tolerance=0.5):
        """
        Compare performance against score.
        tolerance: Time window in seconds to accept a note (e.g. +/- 0.5s)
        """
        if not expected_notes:
            return {'score': 0, 'error': 'No notes in MusicXML'}
        if not played_notes:
            return {'score': 0, 'error': 'No notes detected in audio'}

        # 1. ALIGNMENT (Rough Sync)
        # Shift played notes so the first played note matches the first expected note.
        # This handles cases where the user waited 3 seconds before playing.
        time_offset = played_notes[0]['start_time'] - expected_notes[0]['start_time']
        
        # Create a "Synced" version of played notes for comparison
        synced_played = []
        for p in played_notes:
            p_copy = p.copy()
            p_copy['synced_time'] = p['start_time'] - time_offset
            synced_played.append(p_copy)

        # 2. MATCHING LOGIC
        matched_indices = set() # Keep track of which played notes we've "used"
        matches = []
        missed = []
        
        # Iterate through what we EXPECTED to hear
        for exp in expected_notes:
            # Ensure expected note has MIDI number (parser might only give name)
            if 'midi' not in exp:
                exp['midi'] = librosa.note_to_midi(exp['note'])

            best_match = None
            min_dist = float('inf')
            match_idx = -1

            # Search for this expected note in the played notes
            for i, ply in enumerate(synced_played):
                if i in matched_indices: continue # Already matched
                
                # Check Pitch
                if ply['midi'] != exp['midi']: continue
                
                # Check Time (Are we close enough?)
                dist = abs(ply['synced_time'] - exp['start_time'])
                
                if dist <= tolerance:
                    # If multiple candidates, take the closest one in time
                    if dist < min_dist:
                        min_dist = dist
                        best_match = ply
                        match_idx = i
            
            if best_match:
                # HIT
                matched_indices.add(match_idx)
                matches.append({
                    'expected': exp['note'],
                    'played': best_match['note'],
                    'expected_time': round(exp['start_time'], 2),
                    'played_time': round(best_match['synced_time'], 2),
                    'time_diff': round(best_match['synced_time'] - exp['start_time'], 3)
                })
            else:
                # MISS
                missed.append({
                    'note': exp['note'],
                    'time': round(exp['start_time'], 2)
                })

        # 3. EXTRA NOTES (Wrong notes played)
        extras = []
        for i, ply in enumerate(synced_played):
            if i not in matched_indices:
                extras.append({
                    'note': ply['note'],
                    'time': round(ply['synced_time'], 2)
                })

        # 4. SCORING
        # Simple Accuracy = Correct / Total Expected
        # (You can make this more complex later)
        accuracy = (len(matches) / len(expected_notes)) * 100
        
        # Subtract points for extra notes (clumsiness penalty)
        # Cap min score at 0
        penalty = len(extras) * 2 # -2% for every wrong note
        final_score = max(0, accuracy - penalty)

        return {
            'overall_score': round(final_score, 1),
            'stats': {
                'total_expected': len(expected_notes),
                'correct_hits': len(matches),
                'missed_notes': len(missed),
                'extra_notes': len(extras)
            },
            'details': {
                'matches': matches,
                'missed': missed,
                'extras': extras
            },
            'raw_played': played_notes # For debug visualization
        }

# --- STANDALONE TESTING ---
if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Run Polyphonic Verification")
    parser.add_argument("--audio", required=True, help="Path to recording (wav/mp3)")
    parser.add_argument("--xml", required=True, help="Path to MusicXML score")
    parser.add_argument("--model", default="chord_det_model/best_polyphonic_model.keras", help="Path to .keras model")
    
    args = parser.parse_args()
    
    # 1. Init
    print("\n--- 1. INITIALIZING ---")
    transcriber = PolyphonicTranscriber(args.model)
    verifier = PolyphonicVerifier()
    
    # 2. Transcribe
    print("\n--- 2. LISTENING (AI Transcription) ---")
    played_notes = transcriber.transcribe(args.audio)
    print(f"Detected {len(played_notes)} notes in audio.")
    
    # 3. Parse Score
    print("\n--- 3. READING SCORE (MusicXML) ---")
    expected_notes = parse_musicxml(args.xml)
    print(f"Score contains {len(expected_notes)} notes.")
    
    # 4. Verify
    print("\n--- 4. COMPARING ---")
    result = verifier.verify(played_notes, expected_notes)
    
    # 5. Report
    print("\n" + "="*40)
    print(f" FINAL SCORE: {result['overall_score']}/100")
    print("="*40)
    print(f"Correct: {result['stats']['correct_hits']}")
    print(f"Missed:  {result['stats']['missed_notes']}")
    print(f"Extra:   {result['stats']['extra_notes']}")
    
    # Print JSON for frontend testing
    # print(json.dumps(result, indent=2))
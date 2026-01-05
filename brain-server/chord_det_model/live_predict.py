import numpy as np
import librosa
import tensorflow as tf
import pyaudio
import time
import os

# --- 1. CONFIGURATION ---
# MUST match your training data exactly
SR = 16000           # Sample Rate
HOP_LENGTH = 512     # For CQT
MIN_MIDI = 21        # A0
NUM_KEYS = 88        # Piano range
THRESHOLD = 0.5      # Confidence threshold (tune this if too sensitive)

# Microphone Settings
CHUNK_SIZE = 4096    # How much audio to read at once (approx 0.25s)
BUFFER_SECONDS = 2.0 # Keep last 2 seconds in memory for the model

# --- 2. CHORD LOGIC ---
def name_chord(note_names):
    """Simple logic to name the chord from notes."""
    if not note_names: return ""
    
    unique_notes = sorted(list(set([n[:-1] for n in note_names if n[-1].isdigit()])))
    if not unique_notes: return ""

    # Common shapes (Intervals relative to root)
    shapes = {
        (0, 4, 7): "Maj",
        (0, 3, 7): "Min",
        (0, 3, 6): "Dim",
        (0, 4, 7, 11): "Maj7",
        (0, 3, 7, 10): "Min7",
        (0, 4, 7, 10): "Dom7"
    }
    
    base_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

    for root in unique_notes:
        if root not in base_notes: continue
        root_idx = base_notes.index(root)
        
        current_intervals = []
        for n in unique_notes:
            if n not in base_notes: continue
            idx = base_notes.index(n)
            dist = (idx - root_idx) % 12
            current_intervals.append(dist)
        
        current_intervals = tuple(sorted(list(set(current_intervals))))
        
        if current_intervals in shapes:
            return f"{root} {shapes[current_intervals]}"

    return "" # Return empty if no standard chord found

# --- 3. LIVE ENGINE ---

class LivePredictor:
    def __init__(self, model_path):
        print("Loading Model...")
        self.model = tf.keras.models.load_model(model_path)
        self.buffer = np.zeros(int(SR * BUFFER_SECONDS))
        
        # Audio Stream Setup
        self.p = pyaudio.PyAudio()
        self.stream = self.p.open(
            format=pyaudio.paFloat32,
            channels=1,
            rate=SR,
            input=True,
            frames_per_buffer=CHUNK_SIZE
        )
        print("Microphone Ready. Playing...")

    def extract_features_from_buffer(self):
        # Calculate CQT on the current buffer
        # (This is the heavy math part)
        cqt = librosa.cqt(
            self.buffer, sr=SR, hop_length=HOP_LENGTH, 
            fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12
        )
        cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
        cqt_norm = (cqt_db + 80.0) / 80.0
        return np.clip(cqt_norm, 0, 1).T

    def run(self):
        print("\n--- LIVE DETECTION (Press Ctrl+C to Stop) ---")
        try:
            while True:
                # 1. Read Mic Data
                data = self.stream.read(CHUNK_SIZE, exception_on_overflow=False)
                new_audio = np.frombuffer(data, dtype=np.float32)
                
                # 2. Shift Buffer (Discard old, add new)
                self.buffer = np.roll(self.buffer, -len(new_audio))
                self.buffer[-len(new_audio):] = new_audio
                
                # 3. Predict (Only if audio is loud enough to matter)
                if np.max(np.abs(new_audio)) > 0.01: 
                    features = self.extract_features_from_buffer()
                    
                    # Add batch dim -> (1, Time, 88)
                    input_data = np.expand_dims(features, axis=0)
                    
                    # Predict
                    preds = self.model.predict(input_data, verbose=0)
                    
                    # Check the LAST frame (most recent moment)
                    last_frame_pred = preds[0][-1]
                    
                    # Decode Notes
                    active_indices = np.where(last_frame_pred > THRESHOLD)[0]
                    active_notes = [librosa.midi_to_note(i + MIN_MIDI) for i in active_indices]
                    
                    # Decode Chord
                    chord = name_chord(active_notes)
                    
                    # Pretty Print (Overwrite line)
                    output_str = f"Notes: {active_notes}  |  Chord: {chord}"
                    print(f"\r{output_str.ljust(80)}", end="")
                    
                else:
                    print(f"\r{'...Listening...'.ljust(80)}", end="")

        except KeyboardInterrupt:
            print("\nStopping...")
            self.stream.stop_stream()
            self.stream.close()
            self.p.terminate()

if __name__ == "__main__":
    MODEL_PATH = "polyphonic_model.keras" # Make sure this matches!
    
    if os.path.exists(MODEL_PATH):
        predictor = LivePredictor(MODEL_PATH)
        predictor.run()
    else:
        print("Model file not found. Train it first!")
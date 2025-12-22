import numpy as np
import librosa
import tensorflow as tf
import os

# --- CONFIGURATION ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
NUM_KEYS = 88
THRESHOLD = 0.5

# --- 1. CUSTOM LOSS (REQUIRED FOR LOADING) ---
def class_weighted_loss(y_true, y_pred):
    """
    We must define this so Keras knows how to load the model's brain.
    """
    bce = tf.keras.backend.binary_crossentropy(y_true, y_pred)
    weight_vector = y_true * 9.0 + 1.0 
    weighted_bce = weight_vector * bce
    return tf.reduce_mean(weighted_bce)

# --- 2. CHORD NAMING LOGIC ---
def name_chord(note_names):
    if not note_names: return "."
    unique_notes = sorted(list(set([n[:-1] for n in note_names if n[-1].isdigit()])))
    if not unique_notes: return "."

    shapes = {
        (0, 4, 7): "Major",
        (0, 3, 7): "Minor",
        (0, 3, 6): "Dim",
        (0, 4, 8): "Aug",
        (0, 4, 7, 11): "Maj7",
        (0, 3, 7, 10): "Min7",
        (0, 4, 7, 10): "Dom7",
        (0, 2, 7): "Sus2",
        (0, 5, 7): "Sus4"
    }
    
    base_notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    possible_names = []
    
    for root in unique_notes:
        if root not in base_notes: continue
        root_idx = base_notes.index(root)
        intervals = []
        for n in unique_notes:
            if n not in base_notes: continue
            idx = base_notes.index(n)
            dist = (idx - root_idx) % 12
            intervals.append(dist)
        intervals = tuple(sorted(list(set(intervals))))
        if intervals in shapes:
            possible_names.append(f"{root} {shapes[intervals]}")

    if possible_names: return " / ".join(possible_names)
    else: return "?"

# --- 3. THE ENGINE ---
def run_prediction(model_path, audio_path):
    if not os.path.exists(model_path):
        print("❌ Error: Model file not found.")
        return
    if not os.path.exists(audio_path):
        print(f"❌ Error: Audio file '{audio_path}' not found.")
        return

    print(f"Loading Model: {model_path}...")
    
    # SAFE LOAD: Tries to load with custom loss, falls back to standard if needed
    try:
        model = tf.keras.models.load_model(
            model_path, 
            custom_objects={'class_weighted_loss': class_weighted_loss}
        )
    except Exception:
        print("Warning: Custom loss not found, trying standard load...")
        model = tf.keras.models.load_model(model_path)
    
    print(f"Processing Audio: {audio_path}...")
    y, _ = librosa.load(audio_path, sr=SR)
    
# B. Extract Features (CQT) WITH HARMONIC CLEANUP
    cqt = librosa.cqt(
        y, sr=SR, hop_length=HOP_LENGTH, 
        fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12
    )
    
    # CRITICAL CHANGE: "top_db=30"
    # This tells Librosa: "If a frequency is more than 30dB quieter than the loud note, DELETE IT."
    # Standard was 80dB, which let in all the ghosts. 30dB is strict.
    cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max, top_db=30)
    
    # Normalize (Now scaling 0 to 30dB range to 0..1)
    # The ghosts are now effectively zeroed out
    features = (cqt_db + 30.0) / 30.0
    features = np.clip(features, 0, 1).T

    # Predict
    input_batch = np.expand_dims(features, axis=0)
    preds = model.predict(input_batch, verbose=0)
    timeline_preds = preds[0]

    print("\n--- RESULTS ---")
    print(f"{'TIME':<8} | {'NOTES DETECTED':<30} | {'CHORD GUESS'}")
    print("-" * 60)

    frames_per_step = int(0.25 * SR / HOP_LENGTH)
    
    for i in range(0, len(timeline_preds), frames_per_step):
        frame_probs = timeline_preds[i]
        
        # DEBUG: Check confidence
        max_conf = np.max(frame_probs)
        
        active_indices = np.where(frame_probs > THRESHOLD)[0]
        
        timestamp = i * HOP_LENGTH / SR
        
        if len(active_indices) > 0:
            active_notes = [librosa.midi_to_note(idx + MIN_MIDI) for idx in active_indices]
            chord_name = name_chord(active_notes)
            notes_str = ", ".join(active_notes)
            print(f"{timestamp:05.2f}s  | {notes_str:<30} | {chord_name}")
        else:
            # If silent, print debug info if confidence is suspicious
            if max_conf > 0.1: 
                print(f"{timestamp:05.2f}s  | ... (Max Conf: {max_conf:.2f})")
            pass

if __name__ == "__main__":
    TEST_FILE = "test_input.wav" 
    MODEL_FILE = "polyphonic_model.keras"
    run_prediction(MODEL_FILE, TEST_FILE)

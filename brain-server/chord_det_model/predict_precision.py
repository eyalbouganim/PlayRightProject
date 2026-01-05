import numpy as np
import librosa
import tensorflow as tf
import os

# --- CONFIGURATION ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
NUM_KEYS = 88
# STRICTER THRESHOLD: We removed the aggressive filter, so we need higher confidence
THRESHOLD = 0.7 

# --- 1. LOSS (For Loading) ---
def class_weighted_loss(y_true, y_pred):
    bce = tf.keras.backend.binary_crossentropy(y_true, y_pred)
    weight_vector = y_true * 2.0 + 1.0 
    weighted_bce = weight_vector * bce
    return tf.reduce_mean(weighted_bce)

# --- 2. PREDICTOR ---
def run_prediction(model_path, audio_path):
    if not os.path.exists(model_path): return
    if not os.path.exists(audio_path): return

    print(f"Loading Model: {model_path}...")
    try:
        model = tf.keras.models.load_model(model_path, custom_objects={'class_weighted_loss': class_weighted_loss})
    except:
        model = tf.keras.models.load_model(model_path)
    
    print(f"Processing Audio: {audio_path}...")
    y, _ = librosa.load(audio_path, sr=SR)
    
    # --- CQT (STANDARD MODE) ---
    # We allow full dynamic range (80dB) so the quiet A2 bass is NOT deleted.
    cqt = librosa.cqt(y, sr=SR, hop_length=HOP_LENGTH, fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12)
    cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
    features = np.clip((cqt_db + 80.0) / 80.0, 0, 1).T 

    input_batch = np.expand_dims(features, axis=0)
    preds = model.predict(input_batch, verbose=0)
    timeline_preds = preds[0]

    print("\n--- EXACT NOTE RESULTS ---")
    print(f"{'TIME':<8} | {'NOTES DETECTED'}")
    print("-" * 40)

    frames_per_step = int(0.25 * SR / HOP_LENGTH)
    
    for i in range(0, len(timeline_preds), frames_per_step):
        probs = timeline_preds[i]
        
        # Simple Logic: Only print what is DEFINITELY there
        active_indices = np.where(probs > THRESHOLD)[0]
        timestamp = i * HOP_LENGTH / SR
        
        if len(active_indices) > 0:
            active_notes = [librosa.midi_to_note(idx + MIN_MIDI) for idx in active_indices]
            notes_str = ", ".join(active_notes)
            print(f"{timestamp:05.2f}s  | {notes_str}")
        else:
            # Check if there is "hidden" energy
            max_conf = np.max(probs)
            if max_conf > 0.2:
                print(f"{timestamp:05.2f}s  | ... (weak signal: {max_conf:.2f})")

if __name__ == "__main__":
    TEST_FILE = "A-2-min-chord-2.wav" 
    MODEL_FILE = "polyphonic_model.keras"
    run_prediction(MODEL_FILE, TEST_FILE)
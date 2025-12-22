import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
import os
import random

# --- CONFIGURATION (MINI MODE) ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
MAX_MIDI = 108
NUM_KEYS = 88
MIN_AMPLITUDE = 0.05  # Keep the quality filter on!

# --- 1. MIXER ---
def create_loud_chord(file_paths, num_notes):
    selected_files = random.sample(file_paths, num_notes)
    mixed_audio = None
    active_notes = []

    for path in selected_files:
        try:
            y, _ = librosa.load(path, sr=SR, duration=2.0)
            filename = os.path.basename(path)
            parts = filename.split('-')
            midi_pitch = int(parts[1])
            active_notes.append(midi_pitch)
            
            if mixed_audio is None:
                mixed_audio = y
            else:
                max_len = max(len(mixed_audio), len(y))
                mixed_audio = librosa.util.fix_length(mixed_audio, max_len)
                y = librosa.util.fix_length(y, max_len)
                mixed_audio += y
        except:
            continue

    if mixed_audio is None: return None, []

    max_val = np.max(np.abs(mixed_audio))
    if max_val < MIN_AMPLITUDE: return None, [] # Reject quiet files

    mixed_audio = mixed_audio / max_val # Maximize volume
    return mixed_audio, active_notes

# --- 2. GENERATOR ---
def robust_generator(all_files, batch_size=8):
    while True:
        X_batch = []
        Y_batch = []
        while len(X_batch) < batch_size:
            num_notes = random.randint(3, 6) # Force complexity
            audio, notes = create_loud_chord(all_files, num_notes)
            if audio is None: continue 

            cqt = librosa.cqt(audio, sr=SR, hop_length=HOP_LENGTH, fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12)
            cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
            features = np.clip((cqt_db + 80.0) / 80.0, 0, 1).T

            label_vec = np.zeros(NUM_KEYS)
            for n in notes:
                if MIN_MIDI <= n <= MAX_MIDI:
                    label_vec[n - MIN_MIDI] = 1.0

            target_matrix = np.tile(label_vec, (features.shape[0], 1))
            X_batch.append(features)
            Y_batch.append(target_matrix)

        yield np.array(X_batch), np.array(Y_batch)

# --- 3. MODEL ---
def create_model():
    inputs = Input(shape=(None, NUM_KEYS))
    x = LSTM(128, return_sequences=True)(inputs) # Smaller LSTM for speed
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)
    x = LSTM(128, return_sequences=True)(x) # Smaller LSTM for speed
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)
    outputs = Dense(NUM_KEYS, activation='sigmoid')(x)
    
    model = Model(inputs, outputs)
    # Aggressive learning rate to see quick movement
    opt = tf.keras.optimizers.Adam(learning_rate=0.005) 
    model.compile(optimizer=opt, loss='binary_crossentropy', metrics=['binary_accuracy'])
    return model

# --- 4. MAIN ---
if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    NSYNTH_DIR = os.path.join(BASE_DIR, "dataset_clean") 
    
    all_files = []
    for root, _, files in os.walk(NSYNTH_DIR):
        for f in files:
            if f.endswith(".wav"):
                all_files.append(os.path.join(root, f))
    
    if not all_files:
        print("ERROR: No files found.")
    else:
        print(f"--- SANITY CHECK MODE ---")
        print(f"Files: {len(all_files)}")
        print("Goal: Check if model learns to output values > 0.05")
        
        model = create_model()
        
        history = model.fit(
            robust_generator(all_files, batch_size=8),
            steps_per_epoch=20, # Tiny steps
            epochs=3            # Tiny epochs
        )
        
        model.save("polyphonic_model.keras")
        print("\nSanity Check Complete. Run 'check_brain.py' now!")
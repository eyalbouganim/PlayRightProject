import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
import os
import random

# --- CONFIGURATION ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
MAX_MIDI = 108
NUM_KEYS = 88
MIN_AMPLITUDE = 0.05  # <--- YOUR DECIBEL THRESHOLD (approx -26dB)

# --- 1. MIXER WITH SAFETY CHECKS ---
def create_loud_chord(file_paths, num_notes):
    """
    Creates a mixed chord.
    Returns None if the result is too quiet or empty.
    """
    selected_files = random.sample(file_paths, num_notes)
    mixed_audio = None
    active_notes = []

    for path in selected_files:
        try:
            # Load 2 seconds
            y, _ = librosa.load(path, sr=SR, duration=2.0)
            
            # Extract Pitch from filename
            # Format: guitar_acoustic_015-094-075.wav
            filename = os.path.basename(path)
            parts = filename.split('-')
            midi_pitch = int(parts[1]) 
            
            active_notes.append(midi_pitch)
            
            # Mix
            if mixed_audio is None:
                mixed_audio = y
            else:
                max_len = max(len(mixed_audio), len(y))
                mixed_audio = librosa.util.fix_length(mixed_audio, max_len)
                y = librosa.util.fix_length(y, max_len)
                mixed_audio += y
                
        except Exception:
            continue

    if mixed_audio is None: return None, []

    # --- THE CRITICAL CHECK ---
    # Calculate Max Amplitude (Volume)
    max_val = np.max(np.abs(mixed_audio))
    
    # If it's too quiet, REJECT IT.
    if max_val < MIN_AMPLITUDE:
        return None, [] 

    # Otherwise, NORMALIZE IT (Boost to 1.0)
    mixed_audio = mixed_audio / max_val

    return mixed_audio, active_notes

# --- 2. GENERATOR ---
def robust_generator(all_files, batch_size=32):
    while True:
        X_batch = []
        Y_batch = []
        
        while len(X_batch) < batch_size:
            # Force 3 to 6 notes (Complex Chords)
            num_notes = random.randint(3, 6)
            
            audio, notes = create_loud_chord(all_files, num_notes)
            
            # If rejected (too quiet), loop again immediately
            if audio is None: continue 

            # Feature Extraction
            cqt = librosa.cqt(audio, sr=SR, hop_length=HOP_LENGTH, fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12)
            cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
            
            # Normalize Features to 0..1
            features = (cqt_db + 80.0) / 80.0
            features = np.clip(features, 0, 1).T

            # Create Label
            label_vec = np.zeros(NUM_KEYS)
            for n in notes:
                if MIN_MIDI <= n <= MAX_MIDI:
                    label_vec[n - MIN_MIDI] = 1.0 # 1.0 = Active

            # Repeat label for all time steps
            target_matrix = np.tile(label_vec, (features.shape[0], 1))
            
            X_batch.append(features)
            Y_batch.append(target_matrix)

        # Yield the full batch
        yield np.array(X_batch), np.array(Y_batch)

# --- 3. MODEL (Increased Power) ---
def create_model():
    inputs = Input(shape=(None, NUM_KEYS))
    
    # LSTM Layers
    x = LSTM(256, return_sequences=True)(inputs)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    
    x = LSTM(256, return_sequences=True)(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    
    # Output Layer
    outputs = Dense(NUM_KEYS, activation='sigmoid')(x)
    
    model = Model(inputs, outputs)
    
    # High Learning Rate to escape the "Silence Trap"
    opt = tf.keras.optimizers.Adam(learning_rate=0.001)
    
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
        print(f"Training on {len(all_files)} files.")
        print(f"Filter: Rejecting audio quieter than {MIN_AMPLITUDE} amplitude.")
        
        model = create_model()
        
        # Train
        model.fit(
            robust_generator(all_files, batch_size=16), # Small batch = faster updates
            steps_per_epoch=200, 
            epochs=20
        )
        
        model.save("polyphonic_model.keras")
        print("Model Saved.")

        
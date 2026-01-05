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
MIN_AMPLITUDE = 0.05 

# --- 1. SMART FILE SORTER ---
def sort_files_by_range(all_files):
    """
    Sorts files into Low, Mid, and High bins to ensure balanced training.
    """
    buckets = {
        'low': [],  # MIDI 21 - 47 (A0 - B2) - The "Missing" Bass
        'mid': [],  # MIDI 48 - 71 (C3 - B4) - The Common Stuff
        'high': []  # MIDI 72+     (C5 - C8) - The High Stuff
    }
    
    for path in all_files:
        try:
            parts = os.path.basename(path).split('-')
            midi_pitch = int(parts[1])
            
            if midi_pitch < 48:
                buckets['low'].append(path)
            elif midi_pitch < 72:
                buckets['mid'].append(path)
            else:
                buckets['high'].append(path)
        except:
            continue
            
    return buckets

# --- 2. PRECISION MIXER ---
def create_precision_chord(buckets, num_notes):
    selected_files = []
    
    # FORCE BASS: Ensure at least one low note is in the chord 40% of the time
    if random.random() < 0.40 and buckets['low']:
        selected_files.append(random.choice(buckets['low']))
        # Fill the rest randomly
        for _ in range(num_notes - 1):
            # Pick from any bucket
            cat = random.choice(['low', 'mid', 'high'])
            if buckets[cat]: selected_files.append(random.choice(buckets[cat]))
    else:
        # Standard random mix
        for _ in range(num_notes):
            cat = random.choice(['low', 'mid', 'high'])
            if buckets[cat]: selected_files.append(random.choice(buckets[cat]))

    mixed_audio = None
    active_notes = []

    for path in selected_files:
        try:
            y, _ = librosa.load(path, sr=SR, duration=2.0)
            parts = os.path.basename(path).split('-')
            midi_pitch = int(parts[1])
            
            # --- PREVENT DUPLICATES ---
            if midi_pitch in active_notes: continue
            active_notes.append(midi_pitch)
            
            if mixed_audio is None: mixed_audio = y
            else:
                max_len = max(len(mixed_audio), len(y))
                mixed_audio = librosa.util.fix_length(mixed_audio, max_len)
                y = librosa.util.fix_length(y, max_len)
                mixed_audio += y
        except: continue

    if mixed_audio is None: return None, []
    
    max_val = np.max(np.abs(mixed_audio))
    if max_val < MIN_AMPLITUDE: return None, [] 
    mixed_audio = mixed_audio / max_val 
    return mixed_audio, active_notes

def precision_generator(all_files, buckets, batch_size=16):
    while True:
        X_batch = []
        Y_batch = []
        while len(X_batch) < batch_size:
            
            # 30% Single Notes (Critical for precise pitch learning)
            if random.random() < 0.30:
                num_notes = 1
            else:
                num_notes = random.randint(2, 5)

            audio, notes = create_precision_chord(buckets, num_notes)
            if audio is None: continue 

            # Standard CQT
            cqt = librosa.cqt(audio, sr=SR, hop_length=HOP_LENGTH, fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12)
            cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
            
            # Use Standard Normalization (No aggressive cutting)
            features = np.clip((cqt_db + 80.0) / 80.0, 0, 1).T

            label_vec = np.zeros(NUM_KEYS)
            for n in notes:
                if MIN_MIDI <= n <= MAX_MIDI:
                    label_vec[n - MIN_MIDI] = 1.0

            target_matrix = np.tile(label_vec, (features.shape[0], 1))
            X_batch.append(features)
            Y_batch.append(target_matrix)

        yield np.array(X_batch), np.array(Y_batch)

# --- 3. MODEL & LOSS ---
def class_weighted_loss(y_true, y_pred):
    bce = tf.keras.backend.binary_crossentropy(y_true, y_pred)
    # 3x Penalty is the sweet spot
    weight_vector = y_true * 2.0 + 1.0 
    weighted_bce = weight_vector * bce
    return tf.reduce_mean(weighted_bce)

def create_model():
    inputs = Input(shape=(None, NUM_KEYS))
    x = LSTM(128, return_sequences=True)(inputs)
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)
    x = LSTM(128, return_sequences=True)(x)
    x = BatchNormalization()(x)
    x = Dropout(0.2)(x)
    outputs = Dense(NUM_KEYS, activation='sigmoid')(x)
    model = Model(inputs, outputs)
    opt = tf.keras.optimizers.Adam(learning_rate=0.002)
    model.compile(optimizer=opt, loss=class_weighted_loss, metrics=['binary_accuracy'])
    return model

# --- 4. MAIN ---
if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    NSYNTH_DIR = os.path.join(BASE_DIR, "dataset_clean") 
    
    all_files = []
    for root, _, files in os.walk(NSYNTH_DIR):
        for f in files:
            if f.endswith(".wav"): all_files.append(os.path.join(root, f))
    
    if all_files:
        print(f"--- PRECISION TRAINING START ---")
        buckets = sort_files_by_range(all_files)
        print(f"Low Files (Bass): {len(buckets['low'])}")
        print(f"Mid Files:        {len(buckets['mid'])}")
        print(f"High Files:       {len(buckets['high'])}")
        
        if len(buckets['low']) == 0:
            print("WARNING: No bass files found! Check your dataset.")
        else:
            model = create_model()
            model.fit(
                precision_generator(all_files, buckets, batch_size=16),
                steps_per_epoch=100, 
                epochs=20
            )
            model.save("polyphonic_model.keras")
            print("Done. Model is now Bass-Aware.")
import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
import os
import random
import sys

# --- CONFIGURATION ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
MAX_MIDI = 108
NUM_KEYS = 88
MIN_AMPLITUDE = 0.05
BATCH_SIZE = 8  # Reduced from 16 to keep CPU responsive

# --- 1. RAM CACHE LOADER (The Speed Boost) ---
def preload_dataset(file_paths):
    """
    Loads ALL audio files into a Python Dictionary in RAM.
    Returns: { 'filename': audio_array }
    """
    print(f"--- PRELOADING {len(file_paths)} FILES INTO RAM ---")
    print("This will take a minute, but training will be instant after.")
    
    audio_cache = {}
    valid_paths = []
    
    for i, path in enumerate(file_paths):
        try:
            # Load file fast
            y, _ = librosa.load(path, sr=SR, duration=2.0)
            
            # Save to RAM
            audio_cache[path] = y
            valid_paths.append(path)
            
            # Progress bar
            if i % 100 == 0:
                sys.stdout.write(f"\rLoaded {i}/{len(file_paths)}")
                sys.stdout.flush()
                
        except Exception:
            continue
            
    print(f"\nSuccessfully cached {len(audio_cache)} audio files.")
    return audio_cache, valid_paths

# --- 2. FAST MIXER (Uses RAM) ---
def create_loud_chord_fast(audio_cache, valid_paths, num_notes):
    # Pick random paths
    selected_paths = random.sample(valid_paths, num_notes)
    
    mixed_audio = None
    active_notes = []

    for path in selected_paths:
        # GET FROM RAM (Instant)
        y = audio_cache[path]
        
        # Parse Filename
        filename = os.path.basename(path)
        try:
            parts = filename.split('-')
            midi_pitch = int(parts[1])
            active_notes.append(midi_pitch)
        except:
            continue

        # Add to mix
        if mixed_audio is None:
            mixed_audio = y
        else:
            max_len = max(len(mixed_audio), len(y))
            mixed_audio = librosa.util.fix_length(mixed_audio, max_len)
            y = librosa.util.fix_length(y, max_len)
            mixed_audio += y

    if mixed_audio is None: return None, []

    # Volume Check
    max_val = np.max(np.abs(mixed_audio))
    if max_val < MIN_AMPLITUDE:
        return None, [] 

    # Normalize
    mixed_audio = mixed_audio / max_val
    return mixed_audio, active_notes

# --- 3. GENERATOR ---
def fast_generator(audio_cache, valid_paths, batch_size=BATCH_SIZE):
    while True:
        X_batch = []
        Y_batch = []
        
        while len(X_batch) < batch_size:
            num_notes = random.randint(3, 6)
            
            # Use the FAST mixer
            audio, notes = create_loud_chord_fast(audio_cache, valid_paths, num_notes)
            
            if audio is None: continue 

            # Feature Extraction (Still has to run on CPU)
            cqt = librosa.cqt(audio, sr=SR, hop_length=HOP_LENGTH, fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12)
            cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
            features = np.clip((cqt_db + 80.0) / 80.0, 0, 1).T

            # Labels
            label_vec = np.zeros(NUM_KEYS)
            for n in notes:
                if MIN_MIDI <= n <= MAX_MIDI:
                    label_vec[n - MIN_MIDI] = 1.0

            target_matrix = np.tile(label_vec, (features.shape[0], 1))
            
            X_batch.append(features)
            Y_batch.append(target_matrix)

        yield np.array(X_batch), np.array(Y_batch)

# --- 4. MODEL ---
def create_model():
    inputs = Input(shape=(None, NUM_KEYS))
    
    # Keeping the strong model, but batch_size=8 helps speed
    x = LSTM(256, return_sequences=True)(inputs)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    
    x = LSTM(256, return_sequences=True)(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    
    outputs = Dense(NUM_KEYS, activation='sigmoid')(x)
    
    model = Model(inputs, outputs)
    opt = tf.keras.optimizers.Adam(learning_rate=0.001)
    model.compile(optimizer=opt, loss='binary_crossentropy', metrics=['binary_accuracy'])
    return model

# --- 5. MAIN ---
if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    NSYNTH_DIR = os.path.join(BASE_DIR, "dataset_clean") 
    
    # 1. Gather Paths
    all_files = []
    for root, _, files in os.walk(NSYNTH_DIR):
        for f in files:
            if f.endswith(".wav"):
                all_files.append(os.path.join(root, f))
    
    if not all_files:
        print("ERROR: No files found.")
    else:
        # 2. PRELOAD TO RAM
        # If you have < 16GB RAM and > 20,000 files, reduce this list!
        # all_files = all_files[:10000] 
        cache, paths = preload_dataset(all_files)
        
        print("Starting Turbo Training...")
        model = create_model()
        
        model.fit(
            fast_generator(cache, paths, batch_size=BATCH_SIZE),
            steps_per_epoch=200, 
            epochs=20
        )
        
        model.save("polyphonic_model.keras")
        print("Done.")
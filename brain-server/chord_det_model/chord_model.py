import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
import os

"""
/PlayRightProject
   /dataset
      C-3-maj-chord.wav
      F#-4-min-chord.wav
      ...
   train_piano_model.py
"""

# --- 1. CONFIGURATION ---
SR = 22050
HOP_LENGTH_SECONDS = 0.05
HOP_LENGTH = int(HOP_LENGTH_SECONDS * SR)

# Piano Range (Standard 88 keys)
MIN_MIDI = 21  # A0
MAX_MIDI = 108 # C8
NUM_KEYS = MAX_MIDI - MIN_MIDI + 1 # 88

# Note to Offset Mapping (C=0, C#=1...)
NOTE_OFFSETS = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11
}
# Inverse for debugging
MIDI_TO_NOTE = {i: librosa.midi_to_note(i + MIN_MIDI) for i in range(NUM_KEYS)}

# --- 2. PREPROCESSING (CQT for Octaves) ---

def extract_features(audio_path):
    """
    Converts Audio -> Log-Scale CQT Spectrogram (88 bins)
    """
    print(f"Processing: {os.path.basename(audio_path)}...")
    try:
        y, sr = librosa.load(audio_path, sr=SR)
        
        # CQT: The "Musical" Spectrogram
        cqt = librosa.cqt(
            y, sr=sr,
            hop_length=HOP_LENGTH,
            fmin=librosa.note_to_hz('A0'), # Match MIN_MIDI
            n_bins=NUM_KEYS,               # Match NUM_KEYS
            bins_per_octave=12
        )
        
        # Convert to dB (Log scale)
        cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
        
        # Normalize (-80dB to 0dB -> 0.0 to 1.0)
        cqt_norm = (cqt_db + 80.0) / 80.0
        cqt_norm = np.clip(cqt_norm, 0, 1)
        
        # Shape: (Time, 88)
        return cqt_norm.T 

    except Exception as e:
        print(f"Error reading {audio_path}: {e}")
        return None

def parse_filename_to_midi(filename, num_frames):
    """
    Parses 'F#-3-min-chord-1.wav' -> Multi-hot matrix of 88 keys
    """
    try:
        parts = filename.split('-')
        root_name = parts[0]   # 'F#'
        octave = int(parts[1]) # 3
        quality = parts[2]     # 'min'

        # Fix flats if present
        flat_map = {'Db':'C#', 'Eb':'D#', 'Gb':'F#', 'Ab':'G#', 'Bb':'A#'}
        if root_name in flat_map: root_name = flat_map[root_name]

        # Calculate Root MIDI Note
        # MIDI note 60 is C4. So C3 is 48.
        # Formula: (Octave + 1) * 12 + Offset
        root_midi = (octave + 1) * 12 + NOTE_OFFSETS[root_name]

        # Define Intervals (Semitones from root)
        intervals = [0] # Root is always played
        if quality == 'maj':
            intervals += [4, 7] # Major 3rd, Perfect 5th
        elif quality == 'min':
            intervals += [3, 7] # Minor 3rd, Perfect 5th
        elif quality == 'tritone':
            intervals += [6]
        # Add 'dim', 'aug', '7' rules here if needed

        # Create Label Vector (Size 88)
        y_matrix = np.zeros((num_frames, NUM_KEYS))
        
        for interval in intervals:
            note_midi = root_midi + interval
            
            # Check if note is within piano range
            if MIN_MIDI <= note_midi <= MAX_MIDI:
                # Map MIDI (21-108) -> Index (0-87)
                idx = note_midi - MIN_MIDI
                y_matrix[:, idx] = 1.0 # Set note to Active

        return y_matrix

    except Exception as e:
        # print(f"Skipping {filename}: {e}")
        return None

def load_dataset(data_dir):
    """Loads all valid .wav files from directory."""
    X_list, Y_list = [], []
    print(f"Searching for .wav files in: {data_dir}")

    for root, _, files in os.walk(data_dir):
        for filename in files:
            if filename.endswith(".wav"):
                path = os.path.join(root, filename)
                
                # 1. Get Inputs (CQT)
                features = extract_features(path)
                if features is None: continue

                # 2. Get Targets (Specific Notes)
                targets = parse_filename_to_midi(filename, features.shape[0])
                if targets is None: continue

                X_list.append(features)
                Y_list.append(targets)

    if not X_list:
        raise ValueError("No valid data found! Check filenames and directory.")
    
    return X_list, Y_list

# --- 3. THE MODEL (Real-Time Ready) ---

def create_realtime_model():
    # Shape: (Time, 88 Features)
    inputs = Input(shape=(None, NUM_KEYS)) 

    # Layer 1: LSTM (Unidirectional for Real-Time)
    # 128 units to capture more complexity than 64
    x = LSTM(128, return_sequences=True)(inputs)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)

    # Layer 2: LSTM
    x = LSTM(128, return_sequences=True)(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)

    # Output: 88 Independent Sigmoids
    # "Is Key X pressed?" (Independent probability for each key)
    outputs = Dense(NUM_KEYS, activation='sigmoid')(x)

    model = Model(inputs=inputs, outputs=outputs)
    
    model.compile(
        optimizer='adam',
        # Binary Crossentropy is THE loss for multi-label (polyphonic) tasks
        loss='binary_crossentropy', 
        metrics=['binary_accuracy']
    )
    return model

# --- 4. DATA GENERATOR ---

def train_generator(X_list, Y_list):
    """Yields one song at a time to save RAM."""
    while True:
        indices = np.random.permutation(len(X_list))
        for i in indices:
            # Add batch dimension: (1, Time, 88)
            X_batch = np.expand_dims(X_list[i], axis=0)
            Y_batch = np.expand_dims(Y_list[i], axis=0)
            yield X_batch, Y_batch

# --- 5. MAIN EXECUTION ---

if __name__ == "__main__":
    # A. PATHS
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR = os.path.join(BASE_DIR, "dataset") # Make sure your wavs are here!
    MODEL_SAVE_PATH = os.path.join(BASE_DIR, "piano_note_model.keras")

    # B. LOAD DATA
    print("--- Loading Data ---")
    X, Y = load_dataset(DATA_DIR)
    print(f"Loaded {len(X)} songs.")

    # C. BUILD MODEL
    print("--- Building Real-Time Model ---")
    model = create_realtime_model()
    model.summary()

    # D. TRAIN
    print("--- Starting Training ---")
    model.fit(
        train_generator(X, Y),
        steps_per_epoch=len(X),
        epochs=50 # Increase this if loss is still dropping
    )

    # E. SAVE
    model.save(MODEL_SAVE_PATH)
    print(f"Model saved to {MODEL_SAVE_PATH}")

    # F. QUICK TEST
    print("\n--- Sanity Check on Training Data ---")
    test_idx = 0
    test_in = np.expand_dims(X[test_idx], axis=0)
    preds = model.predict(test_in)
    
    # Check middle frame
    mid = preds.shape[1] // 2
    frame_pred = preds[0][mid]
    
    # Find active notes (Threshold > 0.5)
    active_indices = np.where(frame_pred > 0.5)[0]
    detected_notes = [MIDI_TO_NOTE[i] for i in active_indices]
    
    print(f"Frame {mid} Detected Notes: {detected_notes}")


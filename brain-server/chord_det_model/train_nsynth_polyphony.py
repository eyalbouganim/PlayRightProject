import numpy as np
import librosa
import soundfile as sf
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
import os
import random

# --- 1. CONFIGURATION ---
SR = 16000 # NSynth standard
HOP_LENGTH = 512
MIN_MIDI = 21  # A0
MAX_MIDI = 108 # C8
NUM_KEYS = 88

# Mixing Settings
HARMONIC_PROB = 0.3 # 30% chance of a "Real Chord", 70% "Random Cluster"

# Chord Shapes (Semitones relative to root)
CHORD_SHAPES = {
    'maj': [0, 4, 7],
    'min': [0, 3, 7],
    'dim': [0, 3, 6],
    'aug': [0, 4, 8],
    'sus4': [0, 5, 7],
    'maj7': [0, 4, 7, 11],
    'min7': [0, 3, 7, 10],
    'dom7': [0, 4, 7, 10],
}

# --- 2. FILE INDEXING (The "Library Catalog") ---

def build_file_index(data_dir):
    """
    Scans folder and builds a dictionary: { MIDI_NOTE: [List of Paths] }
    This keeps RAM usage low (only stores strings).
    """
    file_index = {}
    available_notes = set()
    
    print("Indexing files...")
    count = 0
    for root, _, files in os.walk(data_dir):
        for f in files:
            if f.endswith(".wav"):
                path = os.path.join(root, f)
                
                # Parse NSynth Filename: "guitar_acoustic_015-064-100.wav"
                try:
                    parts = f.split('-')
                    # Pitch is usually the second part
                    pitch = int(parts[1])
                    
                    if MIN_MIDI <= pitch <= MAX_MIDI:
                        if pitch not in file_index:
                            file_index[pitch] = []
                        file_index[pitch].append(path)
                        available_notes.add(pitch)
                        count += 1
                except:
                    continue # Skip weird filenames
                    
    print(f"Indexed {count} files across {len(available_notes)} unique pitches.")
    return file_index, list(available_notes)

# --- 3. NOTE SELECTION LOGIC (The "Brain") ---

def get_smart_notes(available_notes, valid_range=(MIN_MIDI, MAX_MIDI)):
    """
    Decides which notes to play based on 70/30 logic.
    Only picks notes that actually exist in your dataset.
    """
    # 1. Flip Coin
    is_harmonic = random.random() < HARMONIC_PROB
    
    selected_notes = []
    
    if is_harmonic:
        # --- PATH A: Musical Chord ---
        # Pick a root that exists
        root = random.choice(available_notes)
        shape_name, intervals = random.choice(list(CHORD_SHAPES.items()))
        
        # Calculate theoretical notes
        theoretical_notes = [root + i for i in intervals]
        
        # Filter: Keep only notes we actually have files for
        selected_notes = [n for n in theoretical_notes if n in available_notes]
        
    else:
        # --- PATH B: Random Chaos (Robustness) ---
        num_notes = random.randint(1, 5)
        # Pick 'num_notes' random pitches from what we have
        # (Use min to avoid error if we have fewer than num_notes total)
        k = min(num_notes, len(available_notes))
        selected_notes = random.sample(available_notes, k)
        
    return selected_notes

# --- 4. AUDIO MIXER ---

def create_mixed_audio(notes, file_index):
    """
    Fetches audio for the specific notes and mixes them.
    """
    mixed_audio = None
    
    for note in notes:
        # 1. Get all possible files for this pitch
        possible_files = file_index.get(note)
        if not possible_files: continue
        
        # 2. Pick ONE random file for this pitch
        path = random.choice(possible_files)
        
        # 3. Load Audio (Only 2.0 seconds to save time)
        y, _ = librosa.load(path, sr=SR, duration=2.0)
        
        # 4. Add to Mix
        if mixed_audio is None:
            mixed_audio = y
        else:
            # Fix lengths
            max_len = max(len(mixed_audio), len(y))
            mixed_audio = librosa.util.fix_length(mixed_audio, size=max_len)
            y = librosa.util.fix_length(y, size=max_len)
            mixed_audio += y

    # 5. Normalize
    if mixed_audio is not None:
        max_val = np.max(np.abs(mixed_audio))
        if max_val > 0:
            mixed_audio = mixed_audio / max_val
            
    return mixed_audio

# --- 5. DATA GENERATOR ---

def data_generator(file_index, available_notes):
    while True:
        # 1. Decide Notes (Smart Logic)
        target_notes = get_smart_notes(available_notes)
        if not target_notes: continue

        # 2. Create Audio
        audio = create_mixed_audio(target_notes, file_index)
        if audio is None: continue

        # 3. Feature Extraction (CQT)
        cqt = librosa.cqt(audio, sr=SR, hop_length=HOP_LENGTH, fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12)
        cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
        features = np.clip((cqt_db + 80.0) / 80.0, 0, 1).T # Shape (Time, 88)

        # 4. Label Matrix
        label_vec = np.zeros(NUM_KEYS)
        for n in target_notes:
            if MIN_MIDI <= n <= MAX_MIDI:
                label_vec[n - MIN_MIDI] = 1.0
        
        # Repeat label for all time steps
        target_matrix = np.tile(label_vec, (features.shape[0], 1))

        # Yield Batch of 1
        yield np.expand_dims(features, axis=0), np.expand_dims(target_matrix, axis=0)

# --- 6. DEBUG & MODEL ---

def generate_debug_examples(file_index, available_notes, output_dir="debug_smart"):
    if not os.path.exists(output_dir): os.makedirs(output_dir)
    print(f"\n--- Saving Debug Examples to '{output_dir}' ---")
    
    for i in range(5):
        notes = get_smart_notes(available_notes)
        audio = create_mixed_audio(notes, file_index)
        if audio is not None:
            note_names = "_".join([librosa.midi_to_note(n) for n in notes])
            path = os.path.join(output_dir, f"test_{i}_{note_names}.wav")
            sf.write(path, audio, SR)
            print(f"Saved: {path}")

def create_model():
    inputs = Input(shape=(None, NUM_KEYS))
    x = LSTM(128, return_sequences=True)(inputs)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    x = LSTM(128, return_sequences=True)(x)
    x = BatchNormalization()(x)
    x = Dropout(0.3)(x)
    outputs = Dense(NUM_KEYS, activation='sigmoid')(x)
    
    model = Model(inputs, outputs)
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['binary_accuracy'])
    return model

# --- 7. MAIN ---

if __name__ == "__main__":
    # A. PATHS
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    NSYNTH_DIR = os.path.join(BASE_DIR, "dataset_clean")
    
    # B. INDEX
    if not os.path.exists(NSYNTH_DIR):
        print(f"ERROR: Folder not found at {NSYNTH_DIR}")
        exit()
        
    index, avail_notes = build_file_index(NSYNTH_DIR)
    
    if not avail_notes:
        print("ERROR: No valid files found.")
        exit()

    # C. DEBUG CHECK
    generate_debug_examples(index, avail_notes)
    
    check = input("\nCheck the 'debug_smart' folder. Do the files sound like chords? (y/n): ")
    if check.lower() == 'y':
        # D. TRAIN
        print("Starting Training...")
        model = create_model()
        model.fit(
            data_generator(index, avail_notes),
            steps_per_epoch=1000,
            epochs=20
        )
        model.save(os.path.join(BASE_DIR, "polyphonic_model.keras"))
        print("Saved model!")
    else:
        print("Aborted.")

        
        
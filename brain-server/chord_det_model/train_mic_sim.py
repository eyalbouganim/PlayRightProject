import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
import os
import random
import scipy.signal

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# --- CONFIGURATION ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
MAX_MIDI = 108
NUM_KEYS = 88
MIN_AMPLITUDE = 0.05 

# --- 1. CHORD DEFINITIONS ---
CHORD_SHAPES = {
    "Major": [0, 4, 7], "Minor": [0, 3, 7], "Dim": [0, 3, 6],
    "Aug": [0, 4, 8], "Sus2": [0, 2, 7], "Sus4": [0, 5, 7],
    "Maj7": [0, 4, 7, 11], "Min7": [0, 3, 7, 10], "Dom7": [0, 4, 7, 10]
}

# --- 2. DATA HELPER ---
def build_file_map(all_files):
    file_map = {}
    for path in all_files:
        try:
            parts = os.path.basename(path).split('-')
            pitch = int(parts[1])
            if pitch not in file_map: file_map[pitch] = []
            file_map[pitch].append(path)
        except: continue
    return file_map

# --- 3. BAD MIC SIMULATOR (The Key Fix) ---
def simulate_bad_mic(audio):
    """
    Simulates a cheap microphone by killing bass frequencies.
    """
    # Create a High-Pass Filter (cutoff 200Hz - 400Hz random)
    cutoff = random.randint(200, 400)
    nyquist = 0.5 * SR
    norm_cutoff = cutoff / nyquist
    
    # 2nd order Butterworth High-Pass
    b, a = scipy.signal.butter(2, norm_cutoff, btype='high', analog=False)
    
    # Apply filter
    filtered_audio = scipy.signal.lfilter(b, a, audio)
    return filtered_audio

# --- 4. GENERATOR ---
def create_specific_chord(target_notes, file_map, use_bad_mic=False):
    mixed_audio = None
    active_notes = []

    for note in target_notes:
        if note not in file_map: continue
        path = random.choice(file_map[note])
        try:
            y, _ = librosa.load(path, sr=SR, duration=2.0)
            active_notes.append(note)
            if mixed_audio is None: mixed_audio = y
            else:
                max_len = max(len(mixed_audio), len(y))
                mixed_audio = librosa.util.fix_length(mixed_audio, max_len)
                y = librosa.util.fix_length(y, max_len)
                mixed_audio += y
        except: continue

    if mixed_audio is None: return None, []
    
    # Apply Mic Simulation BEFORE normalization
    if use_bad_mic:
        mixed_audio = simulate_bad_mic(mixed_audio)

    max_val = np.max(np.abs(mixed_audio))
    if max_val < MIN_AMPLITUDE: return None, [] 
    mixed_audio = mixed_audio / max_val 
    return mixed_audio, active_notes

def robust_generator(all_files, file_map, batch_size=16):
    available_pitches = list(file_map.keys())
    while True:
        X_batch = []
        Y_batch = []
        while len(X_batch) < batch_size:
            dice = random.random()
            target_notes = []
            
            # 50% chance to simulate YOUR laptop mic
            bad_mic_mode = random.random() < 0.50

            # 30% Single / 40% Chord / 30% Random
            if dice < 0.30:
                note = random.choice(available_pitches)
                target_notes = [note]
            elif dice < 0.70:
                root = random.choice(available_pitches)
                shape_name = random.choice(list(CHORD_SHAPES.keys()))
                for interval in CHORD_SHAPES[shape_name]:
                    note = root + interval
                    if note <= MAX_MIDI: target_notes.append(note)
            else:
                num_notes = random.randint(2, 6)
                for _ in range(num_notes):
                    target_notes.append(random.choice(available_pitches))
            
            audio, notes = create_specific_chord(target_notes, file_map, use_bad_mic=bad_mic_mode)
            if audio is None or not notes: continue 

            # CQT
            cqt = librosa.cqt(audio, sr=SR, hop_length=HOP_LENGTH, fmin=librosa.note_to_hz('A0'), n_bins=NUM_KEYS, bins_per_octave=12)
            cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)
            features = np.clip((cqt_db + 80.0) / 80.0, 0, 1).T

            label_vec = np.zeros(NUM_KEYS)
            for n in notes:
                if MIN_MIDI <= n <= MAX_MIDI: label_vec[n - MIN_MIDI] = 1.0

            target_matrix = np.tile(label_vec, (features.shape[0], 1))
            X_batch.append(features)
            Y_batch.append(target_matrix)

        yield np.array(X_batch), np.array(Y_batch)

# --- 5. MODEL & LOSS ---
def class_weighted_loss(y_true, y_pred):
    bce = tf.keras.backend.binary_crossentropy(y_true, y_pred)
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

# --- MAIN ---
if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    NSYNTH_DIR = os.path.join(BASE_DIR, "dataset_clean") 
    
    all_files = []
    for root, _, files in os.walk(NSYNTH_DIR):
        for f in files:
            if f.endswith(".wav"): all_files.append(os.path.join(root, f))
    
    if all_files:
        print(f"--- TRAINING WITH MIC SIMULATION ---")
        print("This teaches the AI to hear notes even when bass is missing.")
        file_map = build_file_map(all_files)
        model = create_model()
        model.fit(
            robust_generator(all_files, file_map, batch_size=16),
            steps_per_epoch=100, epochs=20
        )
        model.save("polyphonic_model.keras")
        print("Done.")
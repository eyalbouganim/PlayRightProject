import numpy as np
import librosa
import tensorflow as tf
import os

# --- 1. CONFIGURATION (MUST MATCH TRAINING EXACTLY) ---
SR = 22050
HOP_LENGTH_SECONDS = 0.05

# We need the inverse mapping to turn numbers back into names
CHORD_TO_INDEX = {
    'N': 0, 'C:maj': 1, 'C:min': 2, 'C#:maj': 3, 'C#:min': 4,
    'D:maj': 5, 'D:min': 6, 'D#:maj': 7, 'D#:min': 8,
    'E:maj': 9, 'E:min': 10, 'F:maj': 11, 'F:min': 12,
    'F#:maj': 13, 'F#:min': 14, 'G:maj': 15, 'G:min': 16,
    'G#:maj': 17, 'G#:min': 18, 'A:maj': 19, 'A:min': 20,
    'A#:maj': 21, 'A#:min': 22, 'B:maj': 23, 'B:min': 24,
    'C:tritone': 25, 'C#:tritone': 26, 'D:tritone': 27, 'D#:tritone': 28,
    'E:tritone': 29, 'F:tritone': 30, 'F#:tritone': 31, 'G:tritone': 32,
    'G#:tritone': 33, 'A:tritone': 34, 'A#:tritone': 35, 'B:tritone': 36,
}
INDEX_TO_CHORD = {v: k for k, v in CHORD_TO_INDEX.items()}

# --- 2. PREPROCESSING FUNCTION (COPY-PASTE FROM TRAIN SCRIPT) ---
def extract_features(audio_path):
    print(f"Processing: {audio_path}...")
    try:
        y, sr = librosa.load(audio_path, sr=SR)
        hop_length = int(HOP_LENGTH_SECONDS * SR)
        chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=hop_length)
        chroma_db = librosa.amplitude_to_db(chroma, ref=np.max)
        chroma_norm = (chroma_db + 80.0) / 80.0
        chroma_norm = np.clip(chroma_norm, 0, 1)
        return chroma_norm.T # Shape: (Time, 12)
    except Exception as e:
        print(f"Error: {e}")
        return None

# --- 3. THE PREDICTION LOGIC ---
def predict_song(model_path, audio_file):
    # A. Load the Model
    print(f"Loading model from {model_path}...")
    model = tf.keras.models.load_model(model_path)
    
    # B. Prepare the Audio
    features = extract_features(audio_file)
    if features is None: return

    # C. Add Batch Dimension (Model expects (1, Time, 12))
    # We are simulating a "batch of 1 song"
    input_data = np.expand_dims(features, axis=0)

    # D. Run Inference
    print("Analyzing audio...")
    predictions = model.predict(input_data)
    
    # The model returns a list: [notes_output, chords_output]
    # We only care about chords for this demo, which is usually the second output
    # (Check your model.outputs names if unsure, but usually order is preserved)
    pred_chords = predictions[1] 

    # E. Interpret Results
    # pred_chords shape is (1, Time_Steps, 37)
    # We want to flatten the batch to get (Time_Steps, 37)
    confidence_matrix = pred_chords[0]
    
    print("\n--- RESULTS ---")
    # Let's print the chord every 0.5 seconds (every 10 frames approx)
    frames_per_print = int(0.5 / HOP_LENGTH_SECONDS) 
    
    for i in range(0, len(confidence_matrix), frames_per_print):
        # Get the index of the highest probability at this moment
        best_index = np.argmax(confidence_matrix[i])
        confidence = confidence_matrix[i][best_index]
        
        # Get the name
        chord_name = INDEX_TO_CHORD.get(best_index, "Unknown")
        
        # Calculate timestamp
        timestamp = i * HOP_LENGTH_SECONDS
        
        # Only print if confident > 40% (filters noise)
        if confidence > 0.4:
            print(f"Time: {timestamp:.2f}s | Chord: {chord_name} ({confidence*100:.1f}%)")
        else:
            print(f"Time: {timestamp:.2f}s | ...Unsure...")

# --- 4. RUN IT ---
if __name__ == "__main__":
    # Replace with your actual file paths!
    MODEL_PATH = "my_chord_model.keras" 
    TEST_AUDIO = "test.wav" 
    
    if os.path.exists(MODEL_PATH) and os.path.exists(TEST_AUDIO):
        predict_song(MODEL_PATH, TEST_AUDIO)
    else:
        print("Error: Could not find model or audio file.")
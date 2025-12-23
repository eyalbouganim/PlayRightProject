import numpy as np
import librosa
import tensorflow as tf
import os
import random

# --- CONFIGURATION (must match training) ---
SR = 16000
HOP_LENGTH = 512
MIN_MIDI = 21
MAX_MIDI = 108
NUM_KEYS = 88

# MIDI to note name mapping
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def midi_to_note_name(midi_num):
    """Convert MIDI number to note name with octave"""
    if midi_num < 0 or midi_num > 127:
        return "Invalid"
    octave = (midi_num // 12) - 1
    note = NOTE_NAMES[midi_num % 12]
    return f"{note}{octave}"

def extract_features(audio_path):
    """Extract CQT features from audio file (must match training)"""
    try:
        # Load audio
        y, _ = librosa.load(audio_path, sr=SR, duration=2.0)
        
        # Extract CQT with same parameters as training
        cqt = librosa.cqt(
            y, 
            sr=SR, 
            hop_length=HOP_LENGTH, 
            fmin=librosa.note_to_hz('A0'), 
            n_bins=NUM_KEYS * 2,
            bins_per_octave=24
        )
        
        # Downsample to match training
        cqt = cqt[::2, :]
        
        # Convert to dB and normalize
        cqt_mag = np.abs(cqt)
        cqt_db = librosa.amplitude_to_db(cqt_mag, ref=np.max)
        features = np.clip((cqt_db + 80.0) / 80.0, 0, 1).T
        
        return features
    except Exception as e:
        print(f"Error extracting features: {e}")
        return None

def predict_notes(model, audio_path, threshold=0.7, use_middle_frame=True):
    """
    Predict notes from an audio file
    
    Args:
        model: Trained Keras model
        audio_path: Path to audio file
        threshold: Confidence threshold for note detection (0.0-1.0)
        use_middle_frame: If True, only analyze middle frame; if False, average all frames
    
    Returns:
        detected_notes: List of (MIDI number, note name, confidence) tuples
    """
    # Extract features
    features = extract_features(audio_path)
    if features is None:
        return []
    
    # Add batch dimension
    features_batch = np.expand_dims(features, axis=0)
    
    # Predict
    predictions = model.predict(features_batch, verbose=0)[0]  # Shape: (time_frames, 88)
    
    # Get predictions for middle frame or average
    if use_middle_frame:
        mid_frame = predictions.shape[0] // 2
        note_confidences = predictions[mid_frame, :]
    else:
        # Average across time frames (more robust)
        note_confidences = np.mean(predictions, axis=0)
    
    # Find notes above threshold
    detected_notes = []
    for i, confidence in enumerate(note_confidences):
        if confidence >= threshold:
            midi_num = MIN_MIDI + i
            note_name = midi_to_note_name(midi_num)
            detected_notes.append((midi_num, note_name, confidence))
    
    # Sort by confidence (highest first)
    detected_notes.sort(key=lambda x: x[2], reverse=True)
    
    return detected_notes

def get_ground_truth_from_filename(audio_path):
    """Extract MIDI numbers from filename if available"""
    filename = os.path.basename(audio_path)
    # Assuming format like: instrument-060-velocity-100.wav
    try:
        parts = filename.split('-')
        midi_num = int(parts[1])
        return [midi_num]
    except:
        return None

def test_on_random_chords(model, dataset_dir, num_tests=10, threshold=0.7):
    """Test model on random synthetic chords"""
    print("\n" + "="*70)
    print("TESTING ON RANDOM SYNTHETIC CHORDS")
    print("="*70)
    
    # Collect all files
    all_files = []
    for root, _, files in os.walk(dataset_dir):
        for f in files:
            if f.endswith(".wav"):
                all_files.append(os.path.join(root, f))
    
    if len(all_files) < 5:
        print("Not enough files for testing")
        return
    
    total_precision = 0
    total_recall = 0
    total_f1 = 0
    
    for test_num in range(num_tests):
        # Create a random chord (3-5 notes)
        num_notes = random.randint(3, 5)
        selected_files = random.sample(all_files, num_notes)
        
        # Mix audio
        mixed_audio = None
        true_notes = []
        
        for path in selected_files:
            try:
                y, _ = librosa.load(path, sr=SR, duration=2.0)
                parts = os.path.basename(path).split('-')
                midi_pitch = int(parts[1])
                
                if MIN_MIDI <= midi_pitch <= MAX_MIDI:
                    true_notes.append(midi_pitch)
                    
                    if mixed_audio is None:
                        mixed_audio = y
                    else:
                        max_len = max(len(mixed_audio), len(y))
                        mixed_audio = librosa.util.fix_length(mixed_audio, size=max_len)
                        y = librosa.util.fix_length(y, size=max_len)
                        mixed_audio += y
            except:
                continue
        
        if mixed_audio is None or len(true_notes) == 0:
            continue
        
        # Normalize
        max_val = np.max(np.abs(mixed_audio))
        mixed_audio = mixed_audio / (max_val * 1.1)
        
        # Save temporary file
        temp_path = "temp_input.wav"
        import soundfile as sf
        sf.write(temp_path, mixed_audio, SR)
        
        # Predict
        detected = predict_notes(model, temp_path, threshold=threshold)
        detected_midi = [d[0] for d in detected]
        
        # Calculate metrics
        true_set = set(true_notes)
        pred_set = set(detected_midi)
        
        correct = len(true_set & pred_set)
        precision = correct / len(pred_set) if len(pred_set) > 0 else 0
        recall = correct / len(true_set) if len(true_set) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        total_precision += precision
        total_recall += recall
        total_f1 += f1
        
        # Print results
        print(f"\nTest {test_num + 1}:")
        print(f"  True notes:     {sorted([midi_to_note_name(m) for m in true_notes])}")
        print(f"  Detected notes: {sorted([d[1] for d in detected])}")
        print(f"  Confidences:    {[f'{d[2]:.3f}' for d in detected]}")
        print(f"  Precision: {precision:.3f} | Recall: {recall:.3f} | F1: {f1:.3f}")
        
        # Clean up
        if os.path.exists(temp_path):
            os.remove(temp_path)
    
    # Print average metrics
    print("\n" + "="*70)
    print(f"AVERAGE METRICS (over {num_tests} tests):")
    print(f"  Precision: {total_precision/num_tests:.3f}")
    print(f"  Recall:    {total_recall/num_tests:.3f}")
    print(f"  F1 Score:  {total_f1/num_tests:.3f}")
    print("="*70)

def test_single_file(model, audio_path, threshold=0.7):
    """Test model on a single audio file"""
    print("\n" + "="*70)
    print(f"ANALYZING: {os.path.basename(audio_path)}")
    print("="*70)
    
    # Get ground truth if available
    true_notes = get_ground_truth_from_filename(audio_path)
    
    # Predict
    detected = predict_notes(model, audio_path, threshold=threshold)
    
    # Display results
    if true_notes:
        print(f"\nGround Truth: {[midi_to_note_name(m) for m in true_notes]}")
    
    print(f"\nDetected Notes (threshold={threshold}):")
    if detected:
        print(f"{'MIDI':<6} {'Note':<6} {'Confidence':<12}")
        print("-" * 24)
        for midi_num, note_name, conf in detected:
            print(f"{midi_num:<6} {note_name:<6} {conf:.4f}")
    else:
        print("  No notes detected!")
    
    # Calculate accuracy if ground truth available
    if true_notes:
        detected_midi = [d[0] for d in detected]
        true_set = set(true_notes)
        pred_set = set(detected_midi)
        
        correct = len(true_set & pred_set)
        precision = correct / len(pred_set) if len(pred_set) > 0 else 0
        recall = correct / len(true_set) if len(true_set) > 0 else 0
        
        print(f"\nAccuracy Metrics:")
        print(f"  Precision: {precision:.3f}")
        print(f"  Recall:    {recall:.3f}")
    
    print("="*70)

def find_optimal_threshold(model, dataset_dir, num_tests=50):
    """Find the optimal threshold for note detection"""
    print("\n" + "="*70)
    print("FINDING OPTIMAL THRESHOLD")
    print("="*70)
    
    thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    best_threshold = 0.5
    best_f1 = 0
    
    for threshold in thresholds:
        print(f"\nTesting threshold: {threshold}")
        
        # Collect all files
        all_files = []
        for root, _, files in os.walk(dataset_dir):
            for f in files:
                if f.endswith(".wav"):
                    all_files.append(os.path.join(root, f))
        
        if len(all_files) < 5:
            continue
        
        total_f1 = 0
        valid_tests = 0
        
        for _ in range(num_tests):
            # Create random chord
            num_notes = random.randint(3, 5)
            selected_files = random.sample(all_files, num_notes)
            
            mixed_audio = None
            true_notes = []
            
            for path in selected_files:
                try:
                    y, _ = librosa.load(path, sr=SR, duration=2.0)
                    parts = os.path.basename(path).split('-')
                    midi_pitch = int(parts[1])
                    
                    if MIN_MIDI <= midi_pitch <= MAX_MIDI:
                        true_notes.append(midi_pitch)
                        if mixed_audio is None:
                            mixed_audio = y
                        else:
                            max_len = max(len(mixed_audio), len(y))
                            mixed_audio = librosa.util.fix_length(mixed_audio, size=max_len)
                            y = librosa.util.fix_length(y, size=max_len)
                            mixed_audio += y
                except:
                    continue
            
            if mixed_audio is None or len(true_notes) == 0:
                continue
            
            max_val = np.max(np.abs(mixed_audio))
            mixed_audio = mixed_audio / (max_val * 1.1)
            
            temp_path = "temp_threshold_test.wav"
            import soundfile as sf
            sf.write(temp_path, mixed_audio, SR)
            
            detected = predict_notes(model, temp_path, threshold=threshold)
            detected_midi = [d[0] for d in detected]
            
            true_set = set(true_notes)
            pred_set = set(detected_midi)
            
            correct = len(true_set & pred_set)
            precision = correct / len(pred_set) if len(pred_set) > 0 else 0
            recall = correct / len(true_set) if len(true_set) > 0 else 0
            f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
            
            total_f1 += f1
            valid_tests += 1
            
            if os.path.exists(temp_path):
                os.remove(temp_path)
        
        avg_f1 = total_f1 / valid_tests if valid_tests > 0 else 0
        print(f"  Average F1: {avg_f1:.3f}")
        
        if avg_f1 > best_f1:
            best_f1 = avg_f1
            best_threshold = threshold
    
    print("\n" + "="*70)
    print(f"OPTIMAL THRESHOLD: {best_threshold} (F1: {best_f1:.3f})")
    print("="*70)
    
    return best_threshold

# --- MAIN ---
if __name__ == "__main__":
    import sys
    
    # Configuration
    MODEL_PATH = "best_polyphonic_model.keras"  # or "polyphonic_model_final.keras"
    DATASET_DIR = "dataset_clean"
    THRESHOLD = 0.7  # Adjust this based on results
    
    print("="*70)
    print("POLYPHONIC NOTE DETECTION - PREDICTION SCRIPT")
    print("="*70)
    
    # Check if model exists
    if not os.path.exists(MODEL_PATH):
        print(f"\nERROR: Model not found at '{MODEL_PATH}'")
        print("Please train the model first!")
        sys.exit(1)
    
    # Load model
    print(f"\nLoading model from: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    print("Model loaded successfully!")
    
    # Menu
    while True:
        print("\n" + "="*70)
        print("CHOOSE AN OPTION:")
        print("="*70)
        print("1. Test on random synthetic chords (recommended first)")
        print("2. Test on a specific audio file")
        print("3. Find optimal threshold")
        print("4. Exit")
        print("="*70)
        
        choice = input("\nEnter your choice (1-4): ").strip()
        
        if choice == "1":
            num_tests = int(input("How many random chords to test? (default 10): ") or "10")
            test_on_random_chords(model, DATASET_DIR, num_tests=num_tests, threshold=THRESHOLD)
            
        elif choice == "2":
            audio_path = input("Enter path to audio file: ").strip()
            if os.path.exists(audio_path):
                test_single_file(model, audio_path, threshold=THRESHOLD)
            else:
                print(f"File not found: {audio_path}")
                
        elif choice == "3":
            num_tests = int(input("How many tests per threshold? (default 50): ") or "50")
            optimal_threshold = find_optimal_threshold(model, DATASET_DIR, num_tests=num_tests)
            THRESHOLD = optimal_threshold
            print(f"\nThreshold updated to: {THRESHOLD}")
            
        elif choice == "4":
            print("\nGoodbye!")
            break
            
        else:
            print("Invalid choice. Please enter 1-4.")
    
    print("\nTIPS:")
    print("  - If recall is low (missing notes), lower the threshold")
    print("  - If precision is low (false positives), raise the threshold")
    print("  - Typical good thresholds: 0.3-0.7")
    print("  - F1 score above 0.8 = good performance")
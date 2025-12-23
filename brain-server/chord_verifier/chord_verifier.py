import numpy as np
import librosa
import soundfile as sf
from scipy.spatial.distance import cosine
from scipy.signal import find_peaks

# --- CONFIGURATION ---
SR = 22050  # Sample rate
HOP_LENGTH = 512
MIN_MIDI = 21  # A0
MAX_MIDI = 108  # C8
NUM_BINS = 88

# --- MIDI NOTE NAMES ---
NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def midi_to_note_name(midi_num):
    """Convert MIDI number to note name with octave"""
    octave = (midi_num // 12) - 1
    note = NOTE_NAMES[midi_num % 12]
    return f"{note}{octave}"

def note_name_to_midi(note_name):
    """Convert note name (e.g., 'C4') to MIDI number"""
    note = note_name[:-1]  # e.g., 'C#'
    octave = int(note_name[-1])  # e.g., 4
    
    note_idx = NOTE_NAMES.index(note)
    midi_num = (octave + 1) * 12 + note_idx
    return midi_num

def create_template_vector(midi_notes):
    """
    Create a 'fuzzy' template vector.
    Target notes get 1.0. Neighbor notes get 0.5.
    This fixes the 'Spectral Leakage' issue where C4 creates energy at B3/C#4.
    """
    template = np.zeros(NUM_BINS)
    
    for midi in midi_notes:
        if MIN_MIDI <= midi <= MAX_MIDI:
            idx = midi - MIN_MIDI
            
            # 1. Main Note
            template[idx] = 1.0
            
            # 2. Add Tolerance (Fuzzy Neighbors)
            # If we expect C4, we also accept some energy at B3 and C#4
            # This prevents the similarity score from tanking due to leakage
            if idx > 0:
                template[idx - 1] = max(template[idx - 1], 0.5)
            if idx < NUM_BINS - 1:
                template[idx + 1] = max(template[idx + 1], 0.5)
                
    return template

def extract_cqt_vector(audio, sr=SR):
    """
    Extract CQT with higher resolution to minimize blur.
    """
    # 1. Compute CQT with filter_scale=2.0 (Sharper frequency analysis)
    cqt = librosa.cqt(
        audio,
        sr=sr,
        hop_length=HOP_LENGTH,
        fmin=librosa.midi_to_hz(MIN_MIDI),
        n_bins=NUM_BINS,
        bins_per_octave=12,
        filter_scale=2.0 
    )
    
    # 2. Convert to magnitude and average over time
    cqt_mag = np.abs(cqt)
    cqt_avg = np.mean(cqt_mag, axis=1)
    
    # 3. Normalize
    if np.max(cqt_avg) > 0:
        cqt_avg = cqt_avg / np.max(cqt_avg)
    
    # 4. Noise Gate
    # Remove anything that is just quiet background noise (< 5%)
    cqt_avg[cqt_avg < 0.05] = 0
    
    return cqt_avg

def verify_chord(audio, expected_midi_notes, threshold=0.65, method='cosine'):
    """
    Verify if played audio matches expected chord using Fuzzy Matching
    """
    # Load audio if path provided
    if isinstance(audio, str):
        audio, sr = librosa.load(audio, sr=SR)
    else:
        sr = SR
    
    # Create fuzzy template
    template = create_template_vector(expected_midi_notes)
    
    # Extract played pattern
    played = extract_cqt_vector(audio, sr)
    
    # Calculate similarity
    if np.sum(played) == 0:
        similarity = 0
    else:
        # Cosine similarity handles the fuzzy matching perfectly
        similarity = 1 - cosine(template, played)
        
    is_match = similarity >= threshold
    
    # --- DETECTED NOTES LOGIC FOR DISPLAY ---
    # We use peak finding here just to show the user "clean" notes
    detected_display = []
    peaks, _ = find_peaks(played, height=0.1)
    for p in peaks:
        midi = MIN_MIDI + p
        detected_display.append((midi_to_note_name(midi), played[p]))
    
    return {
        'is_match': is_match,
        'similarity': similarity,
        'expected_notes': [midi_to_note_name(m) for m in expected_midi_notes],
        'detected_notes': detected_display,
        'threshold': threshold
    }

def verify_chord_with_tolerance(audio, expected_midi_notes):
    """
    Detailed metrics (Precision/Recall) for debugging.
    """
    if isinstance(audio, str):
        audio, sr = librosa.load(audio, sr=SR)
    else:
        sr = SR
    
    # Get raw vector
    played_vector = extract_cqt_vector(audio, sr)
    
    # Find PEAKS only (ignore the side leakage for counting purposes)
    peaks, _ = find_peaks(played_vector, height=0.2, distance=1)
    
    played_notes = set()
    for p in peaks:
        played_notes.add(MIN_MIDI + p)
        
    expected_set = set(expected_midi_notes)
    
    # Calculate Sets
    correct = expected_set.intersection(played_notes)
    missing = expected_set - played_notes
    extra = played_notes - expected_set
    
    # Calculate Stats
    recall = len(correct) / len(expected_set) if len(expected_set) > 0 else 0
    precision = len(correct) / len(played_notes) if len(played_notes) > 0 else 0
    
    return {
        'is_match': recall == 1.0, # Strict match for this function
        'precision': precision,
        'recall': recall,
        'missing': [midi_to_note_name(m) for m in missing],
        'extra': [midi_to_note_name(m) for m in extra],
        'played_notes': [midi_to_note_name(m) for m in played_notes]
    }

# --- AUDIO UTILS ---

def record_from_mic(duration=2.0):
    """Record audio from microphone"""
    try:
        import sounddevice as sd
        print(f"\n🎤 Recording for {duration} seconds...")
        print("Play your chord NOW!")
        audio = sd.rec(int(duration * SR), samplerate=SR, channels=1, dtype='float32')
        sd.wait()
        print("✅ Recording complete!")
        return audio.flatten()
    except ImportError:
        print("\n❌ ERROR: sounddevice not installed")
        print("Install it with: pip install sounddevice")
        return None
    except Exception as e:
        print(f"\n❌ Recording failed: {e}")
        return None

def synthesize_chord(midi_notes, duration=1.5):
    """
    Synthesize chord with smooth envelopes to prevent clicking/spectral noise.
    """
    t = np.linspace(0, duration, int(SR * duration))
    audio = np.zeros_like(t)
    
    for midi in midi_notes:
        freq = librosa.midi_to_hz(midi)
        
        # Smooth Attack/Decay Envelope (prevents "pop" at start/end)
        attack_len = int(SR * 0.05) # 50ms attack
        decay_len = len(t) - attack_len
        
        envelope = np.concatenate([
            np.linspace(0, 1, attack_len),
            np.linspace(1, 0, decay_len)
        ])
        
        # Generate Sine Wave
        note_signal = np.sin(2 * np.pi * freq * t) * envelope
        
        # Add slight harmonics for realism (helps detection too)
        note_signal += 0.3 * np.sin(4 * np.pi * freq * t) * envelope
        
        audio += note_signal
    
    # Normalize
    max_val = np.max(np.abs(audio))
    if max_val > 0:
        audio = audio / max_val * 0.9
        
    return audio

def play_audio(audio):
    """Play audio through speakers"""
    try:
        import sounddevice as sd
        print("🔊 Playing audio...")
        sd.play(audio, SR)
        sd.wait()
        print("✅ Playback complete!")
    except ImportError:
        print("\n❌ sounddevice not installed (pip install sounddevice)")
        print("Saving to temp.wav instead...")
        sf.write("temp.wav", audio, SR)
    except Exception as e:
        print(f"❌ Playback failed: {e}")

# --- TEST RUNNERS ---

def test_synthesized_chord():
    print("=" * 70)
    print("TEST: SYNTHESIZE → PLAY → VERIFY")
    print("=" * 70)
    
    print("\nEnter notes (e.g., 'C4 E4 G4') or press Enter for Default:")
    note_input = input("Your chord: ").strip()
    
    if not note_input:
        note_input = "C4 E4 G4"
        print(f"Using default: {note_input}")

    try:
        midi_notes = [note_name_to_midi(n) for n in note_input.split()]
    except:
        print("Invalid input.")
        return

    # Synthesize
    audio = synthesize_chord(midi_notes)
    
    # Play?
    choice = input("Play audio? (y/n): ").strip().lower()
    if choice == 'y':
        play_audio(audio)
        
    # Verify
    threshold = 0.70
    result = verify_chord(audio, midi_notes, threshold=threshold)
    
    print(f"\n{'='*70}")
    print(f"RESULT: {'✅ MATCH!' if result['is_match'] else '❌ NO MATCH'}")
    print(f"{'='*70}")
    print(f"Similarity: {result['similarity']:.3f} (Threshold: {threshold})")
    print(f"Detected: {[f'{n} ({v:.2f})' for n, v in result['detected_notes']]}")
    
    # Double check with negative test
    print("\n--- Negative Control Test ---")
    wrong_notes = [m + 2 for m in midi_notes] # Shift everything up 2 semitones
    print(f"Checking against WRONG notes: {[midi_to_note_name(m) for m in wrong_notes]}")
    res_wrong = verify_chord(audio, wrong_notes, threshold=threshold)
    print(f"Result: {'✅ Rejected (Good)' if not res_wrong['is_match'] else '❌ False Positive (Bad)'}")
    print(f"Similarity: {res_wrong['similarity']:.3f}")

def test_live_microphone():
    print("=" * 70)
    print("LIVE MICROPHONE TEST")
    print("=" * 70)
    
    note_input = input("Expected notes (e.g. 'C4 E4 G4'): ").strip()
    if not note_input: return
    
    try:
        expected = [note_name_to_midi(n) for n in note_input.split()]
    except:
        print("Invalid notes")
        return
        
    audio = record_from_mic(2.0)
    if audio is None: return
    
    result = verify_chord(audio, expected, threshold=0.70)
    
    print(f"\nResult: {'✅ MATCH' if result['is_match'] else '❌ NO MATCH'}")
    print(f"Score: {result['similarity']:.3f}")
    print(f"Detected: {result['detected_notes']}")

# --- MAIN ---
if __name__ == "__main__":
    while True:
        print("\n" + "="*30)
        print("1. Synthesize & Verify (Test Logic)")
        print("2. Live Microphone (Real Test)")
        print("3. Exit")
        c = input("Choice: ").strip()
        
        if c == '1': test_synthesized_chord()
        elif c == '2': test_live_microphone()
        elif c == '3': break
import os
import glob
import numpy as np
import pretty_midi
from hmmlearn import hmm
from sklearn.preprocessing import StandardScaler
from collections import defaultdict
import warnings
import random

# Suppress warnings for cleaner output
warnings.filterwarnings("ignore")

# --- CONFIGURATION ---
# Path to your extracted MAESTRO folder
DATASET_PATH = "../training_data/maestro-v3.0.0" 

# Paper Settings
N_STATES_ONSET = 20
N_MIXTURES_ONSET = 30
N_STATES_DUR = 2
N_MIXTURES_DUR = 3

def get_adaptive_grid(pm):
    """
    Calculates the 16th-note grid duration specific to this file.
    It uses the estimated beats to find the average tempo.
    """
    try:
        # Get beat locations (timestamps)
        beats = pm.get_beats()
        
        if len(beats) < 2:
            return 0.125 # Fallback: 120BPM (0.5s beat / 4)
            
        # Calculate time difference between beats
        beat_intervals = np.diff(beats)
        
        # Use Median instead of Mean to ignore tempo ramp-ups/downs
        avg_beat_duration = np.median(beat_intervals)
        
        # We assume the grid should be a 16th note (1/4 of a beat)
        grid_16th = avg_beat_duration / 4.0
        
        # Safety clamps (Don't let grid get absurdly small or large)
        # 0.05s = ~300 BPM, 0.5s = ~30 BPM
        grid_16th = max(0.05, min(grid_16th, 0.5))
        
        return grid_16th
        
    except Exception:
        return 0.125 # Fallback

def quantize_note(start_time, end_time, grid):
    """
    Snaps a note to the nearest file-specific grid.
    """
    s = round(start_time / grid) * grid
    e = round(end_time / grid) * grid
    if e <= s: e = s + grid 
    return s, e

def calculate_stats(midi_files):
    print(f"Analyzing {len(midi_files)} MIDI files with Domain Adaptation (Amateur Simulation)...")
    
    all_onset_diffs = []
    pitch_errors = defaultdict(int)
    total_notes_analyzed = 0

    # 1. Jitter: How shaky is the hand? (Standard Deviation in seconds)
    AMATEUR_JITTER_SIGMA = 0.06 # 60ms standard deviation
    
    # 2. Mistakes: Probability of hitting the wrong key entirely
    WRONG_NOTE_PROB = 0.1 # 10% chance of wrong note
    
    for idx, mid_file in enumerate(midi_files):
        try:
            pm = pretty_midi.PrettyMIDI(mid_file)
            file_grid = get_adaptive_grid(pm)

            notes = pm.instruments[0].notes
            
            # Limit to 500 notes to speed up
            for note in notes[:500]: 
                # --- 1. RHYTHM MODELING ---
                # Get the "perfect" score time (Quantized)
                score_start, score_end = quantize_note(note.start, note.end, file_grid)                
                # Calculate the Professional deviation
                real_diff = note.start - score_start
                
                # INJECT AMATEUR NOISE (Domain Adaptation)
                # We add random Gaussian noise to the existing professional deviation
                synthetic_jitter = random.gauss(0, AMATEUR_JITTER_SIGMA)
                
                # This is the "Simulated Amateur Deviation"
                final_diff = real_diff + synthetic_jitter
                
                # Filter absolute garbage (e.g., > 0.5s off is usually a different note)
                if abs(final_diff) < 0.5:
                    all_onset_diffs.append(final_diff)

                # --- 2. PITCH ERROR MODELING ---
                # Only model the 5 error types that the C++ algorithm uses:
                # 0 (correct), ±1 (semitone), ±12 (octave)
                # All other errors are treated as "noise" and mapped to semitone errors

                roll = random.random()
                if roll > (1.0 - WRONG_NOTE_PROB):
                    # Simulate specific types of errors
                    error_type_roll = random.random()
                    if error_type_roll < 0.5:
                        # Semitone slip (most common error type)
                        # Also absorbs "other" errors since C++ only uses these 5 categories
                        err = random.choice([1, -1])
                    else:
                        # Octave slip (common in transcription)
                        err = random.choice([12, -12])

                    pitch_errors[err] += 1
                else:
                    pitch_errors[0] += 1 # Correct note
                
                total_notes_analyzed += 1
                
        except Exception as e:
            continue

    return all_onset_diffs, [], pitch_errors, total_notes_analyzed

def train_paper_model(onset_diffs):
    """ Trains the GMM-HMM for the dataset generator part """
    print(f"\n\n--- Training GMM-HMM ({N_STATES_ONSET} States, {N_MIXTURES_ONSET} Mixtures) ---")
    
    # [CRITICAL FIX] Memory Safety
    # The crash happens because O(N * States^2) is too big for RAM.
    # We limit training data to 50,000 points.
    MAX_SAMPLES = 50000
    
    onset_diffs = np.array(onset_diffs) # Ensure numpy array
    
    if len(onset_diffs) > MAX_SAMPLES:
        print(f"Dataset too large ({len(onset_diffs)} points). Subsampling to {MAX_SAMPLES} to prevent crash...")
        # Randomly select 50k points without replacement
        onset_diffs = np.random.choice(onset_diffs, MAX_SAMPLES, replace=False)

    X_ons = onset_diffs.reshape(-1, 1)
    
    # Keep the academic parameters (20 states, 30 mixtures)
    model = hmm.GMMHMM(n_components=N_STATES_ONSET, n_mix=N_MIXTURES_ONSET, 
                       verbose=True, n_iter=10)
    
    try:
        model.fit(X_ons)
        print(f"Model Converged: {model.monitor_.converged}")
    except Exception as e:
        print(f"Training failed (likely memory): {e}")
        print("Suggestion: Reduce MAX_SAMPLES in the script further (e.g., to 20000).")

    return model

def write_config_file(timing_sigma, timing_mu, pitch_errors, total_notes, output_path):
    """
    Write a config file that matches the C++ algorithm's structure.
    Only outputs the 5 pitch probabilities used by the original algorithm:
    - 0 (correct pitch)
    - ±1 (semitone errors)
    - ±12 (octave errors)
    """
    # Normalize pitch probabilities
    norm_factor = sum(pitch_errors.values())

    # Get the 5 probabilities (symmetric for ±1 and ±12)
    p_correct = pitch_errors[0] / norm_factor
    p_semi_pos = pitch_errors.get(1, 0) / norm_factor
    p_semi_neg = pitch_errors.get(-1, 0) / norm_factor
    p_oct_pos = pitch_errors.get(12, 0) / norm_factor
    p_oct_neg = pitch_errors.get(-12, 0) / norm_factor

    with open(output_path, 'w') as f:
        f.write("# Learned parameters from train_params.py (GMM-HMM)\n")
        f.write(f"# Training notes analyzed: {total_notes}\n")
        f.write("#\n")
        f.write("# === TIMING PARAMETERS ===\n")
        f.write(f"timing_sigma={timing_sigma:.6f}\n")
        f.write(f"timing_mu={timing_mu:.6f}\n")
        f.write("#\n")
        f.write("# === PITCH PROBABILITIES ===\n")
        f.write("# Only 5 categories (matching original C++ structure)\n")
        f.write(f"pitch_prob_0={p_correct:.6f}\n")
        f.write(f"pitch_prob_1={p_semi_pos:.6f}\n")
        f.write(f"pitch_prob_-1={p_semi_neg:.6f}\n")
        f.write(f"pitch_prob_12={p_oct_pos:.6f}\n")
        f.write(f"pitch_prob_-12={p_oct_neg:.6f}\n")

    print(f"\nConfig file written to: {output_path}")
    print(f"  timing_sigma = {timing_sigma:.6f}")
    print(f"  timing_mu = {timing_mu:.6f}")
    print(f"  pitch_prob_0 = {p_correct:.6f}")
    print(f"  pitch_prob_±1 = {(p_semi_pos + p_semi_neg)/2:.6f}")
    print(f"  pitch_prob_±12 = {(p_oct_pos + p_oct_neg)/2:.6f}")

if __name__ == "__main__":
    # Find all MIDI files recursively (MAESTRO organizes by year)
    search_path = os.path.join(DATASET_PATH, "**/*.midi")
    midi_files = glob.glob(search_path, recursive=True)
    
    # Fallback for .mid extension
    if not midi_files:
        search_path = os.path.join(DATASET_PATH, "**/*.mid")
        midi_files = glob.glob(search_path, recursive=True)
    
    if not midi_files:
        print(f"ERROR: No MIDI files found in {DATASET_PATH}")
        print("Please check the path and download the dataset.")
        exit()

    # Run Analysis
    ons_diffs, dur_ratios, p_errors, total = calculate_stats(midi_files)
    
    # --- OUTPUT ---
    print("\n" + "="*40)
    print("   RESULTS: For my C++ code")
    print("="*40)
    
    # 1. Timing Stats for Gaussian
    mu_ons = np.mean(ons_diffs)
    sig_ons = np.std(ons_diffs)
    
    print("\n--- [For ScoreFollower.hpp] ---")
    print("// Values for sigma/mu in UpdateLike()")
    print(f"double learned_sigma = {sig_ons:.5f}; // Standard Deviation")
    print(f"double learned_mu = {mu_ons:.5f};    // Mean Offset")
    
    # 2. Pitch Confusion Matrix
    print("\n// Values for Init() probabilities")
    norm_factor = sum(p_errors.values())
    p_correct = p_errors[0] / norm_factor
    p_semi_up = p_errors.get(1, 0) / norm_factor
    p_octave = p_errors.get(12, 0) / norm_factor
    
    print(f"pitchDiffProb_[0+128] = {p_correct:.4f};")
    print(f"pitchDiffProb_[1+128] = {p_semi_up:.4f};")
    print(f"pitchDiffProb_[12+128] = {p_octave:.4f};")

    # 3. Train the GMM-HMM Model
    model = train_paper_model(ons_diffs)

    # 4. Write config file for C++ to use
    # The config contains timing params + 5 pitch probabilities (matching original structure)
    config_path = "../cpp/learned_params.config"
    write_config_file(sig_ons, mu_ons, p_errors, total, config_path)

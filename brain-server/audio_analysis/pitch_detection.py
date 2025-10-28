"""
Pitch detection and frequency-to-note conversion
"""

import sys
import numpy as np
import librosa


def get_piano_notes():
    """Generate all 88 piano key frequencies"""
    notes = []
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    for midi_num in range(21, 109):  # 88 piano keys
        freq = 440 * (2 ** ((midi_num - 69) / 12))  # A4 = 440Hz = MIDI 69
        octave = (midi_num - 12) // 12
        note_name = note_names[midi_num % 12]
        notes.append({
            'name': f"{note_name}{octave}",
            'freq': freq,
            'midi': midi_num
        })
    
    return notes


PIANO_NOTES = get_piano_notes()


def freq_to_note(frequency):
    """Convert frequency to closest piano note"""
    if frequency <= 0:
        return None
    
    min_diff = float('inf')
    closest_note = None
    
    for note in PIANO_NOTES:
        diff = abs(note['freq'] - frequency)
        if diff < min_diff:
            min_diff = diff
            closest_note = note
    
    # Check if frequency is close enough (within 50 cents / half a semitone)
    if closest_note and min_diff < closest_note['freq'] * 0.03:  # ~3% tolerance
        return closest_note
    
    return None


def detect_pitch_robust(segment, sample_rate, n_fft=2048):
    """
    Robust pitch detection using YIN + HPS (Harmonic Product Spectrum)
    Takes small pitch of audio to find the fundemental frequency
    """
    try:
        # YIN algorithm for fundamental frequency
        f0_yin = librosa.yin(
            segment, 
            fmin=librosa.note_to_hz('A1'), 
            fmax=librosa.note_to_hz('C7'),
            sr=sample_rate, 
            frame_length=n_fft
        )
        f0_yin = f0_yin[f0_yin > 0]
        
        if len(f0_yin) == 0:
            return None
        
        median_freq_yin = float(np.median(f0_yin))
        
        # Secondary check with HPS
        D = np.abs(librosa.stft(segment, n_fft=n_fft))
        harmonics = 5
        D_hps = D.copy()
        
        for h in range(2, harmonics + 1):
            downsampled = D[::h]
            D_hps[:len(downsampled)] *= downsampled
        
        freqs = librosa.fft_frequencies(sr=sample_rate, n_fft=n_fft)
        f0_hps = freqs[np.argmax(D_hps)]
        
        # Combine results: If both methods are quite similar - avg of them
        # else: Go according to YIN
        ratio = f0_hps / median_freq_yin if median_freq_yin > 0 else 0
        if 0.85 < ratio < 1.15:
            return (0.5 * median_freq_yin + 0.5 * f0_hps)
        
        return median_freq_yin
    
    except Exception as e:
        print(f"--- Pitch detection error: {e} ---", file=sys.stderr)
        return None
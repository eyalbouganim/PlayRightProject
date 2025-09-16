import numpy as np
import librosa
from scipy.signal import butter, sosfilt
import sounddevice as sd


def detect_single_note(audio_path,
                       sr_target=22050,
                       highpass_hz=80.0,
                       fmin=65.0,          # C2
                       fmax=1200.0,        # ~ D6
                       frame_length=2048,
                       hop_length=256):
    # Load mono
    y, sr = librosa.load(audio_path, sr=sr_target, mono=True)

    # High-pass filter to reduce fan/AC hum and rumble
    sos = butter(4, highpass_hz, btype='highpass', fs=sr, output='sos')
    y = sosfilt(sos, y)

    # Harmonic-only using HPSS
    y_harm, _ = librosa.effects.hpss(y)

    # STFT energy per frame for weighting and gating
    S = np.abs(librosa.stft(y_harm, n_fft=frame_length, hop_length=hop_length))**2
    frame_energy = S.sum(axis=0) + 1e-12

    # f0 via YIN
    try:
        f0 = librosa.yin(y_harm, fmin=fmin, fmax=fmax, sr=sr,
                         frame_length=frame_length, hop_length=hop_length)
    except Exception:
        return {'note': 'Unknown', 'frequency': 0.0, 'confidence': 0.0}

    valid = np.isfinite(f0)
    if not np.any(valid):
        return {'note': 'Unknown', 'frequency': 0.0, 'confidence': 0.0}

    fe_valid = frame_energy[valid]
    f0_valid = f0[valid]

    # Energy gating: keep only strong frames relative to distribution
    energy_thresh = np.median(fe_valid) * 1.5
    strong = fe_valid >= max(1e-10, energy_thresh)

    if not np.any(strong):
        # fallback to top-quantile frames if nothing passes the gate
        q = np.quantile(fe_valid, 0.8)
        strong = fe_valid >= q

    f0_ke = f0_valid[strong]
    fe_ke = fe_valid[strong]
    if len(f0_ke) == 0:
        return {'note': 'Unknown', 'frequency': 0.0, 'confidence': 0.0}

    # Robust estimate: energy-weighted median
    freq_est = _weighted_median(f0_ke, fe_ke)

    # Confidence from weighted MAD around estimate
    mad = _weighted_mad(f0_ke, fe_ke, center=freq_est) + 1e-9
    spread_ratio = np.clip(mad / freq_est, 0.0, 0.5)  # smaller is better
    conf = (1.0 - (spread_ratio / 0.5)) * 100.0

    note = pitch_to_note(freq_est)
    return {
        'note': note,
        'frequency': float(freq_est),
        'confidence': float(np.clip(conf, 0.0, 100.0))
    }

def pitch_to_note(frequency):
    if not np.isfinite(frequency) or frequency <= 0:
        return "Unknown"
    A4 = 440.0
    C0 = A4 * np.power(2.0, -4.75)
    note_number = int(np.round(12.0 * np.log2(frequency / C0)))
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    note_name = note_names[note_number % 12]
    octave = note_number // 12
    return f"{note_name}{octave}"

def _weighted_median(values, weights):
    order = np.argsort(values)
    v = values[order]
    w = weights[order]
    cdf = np.cumsum(w) / (np.sum(w) + 1e-12)
    idx = np.searchsorted(cdf, 0.5)
    idx = np.clip(idx, 0, len(v) - 1)
    return float(v[idx])

def _weighted_mad(values, weights, center=None):
    if center is None:
        center = _weighted_median(values, weights)
    dev = np.abs(values - center)
    return _weighted_median(dev, weights)
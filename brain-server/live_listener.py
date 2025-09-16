# live_listener.py
import numpy as np
import threading
import queue
import time
import sounddevice as sd
import librosa
from scipy.signal import butter, sosfilt

SR = 22050
BLOCK_SIZE = 1024
HOP_LENGTH = 256
FRAME_LENGTH = 2048
HIGH_PASS_HZ = 80.0
FMIN = 65.0
FMAX = 1200.0
MAX_RING_SEC = 3.0
MIN_STABLE_FRAMES = 6
ENERGY_GATE_FACTOR = 1.2
SILENCE_THRESHOLD = 1e-4

class LiveNoteState:
    def __init__(self):
        self.current_note = "Unknown"
        self.last_stable_note = "Unknown"
        self.frequency = 0.0
        self.confidence = 0.0
        self.lock = threading.Lock()

state = LiveNoteState()
_audio_q = queue.Queue()
_stop = threading.Event()

def pitch_to_note(f):
    if not np.isfinite(f) or f <= 0:
        return "Unknown"
    A4 = 440.0
    C0 = A4 * np.power(2.0, -4.75)
    note_number = int(np.round(12.0 * np.log2(f / C0)))
    note_names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
    return f"{note_names[note_number % 12]}{note_number // 12}"

def _weighted_median(values, weights):
    order = np.argsort(values)
    v = values[order]
    w = weights[order]
    cdf = np.cumsum(w) / (np.sum(w) + 1e-12)
    idx = np.searchsorted(cdf, 0.5)
    idx = np.clip(idx, 0, len(v)-1)
    return float(v[idx])

def _weighted_mad(values, weights, center=None):
    if center is None:
        center = _weighted_median(values, weights)
    dev = np.abs(values - center)
    return _weighted_median(dev, weights)

def _audio_cb(indata, frames, time_info, status):
    mono = np.mean(indata, axis=1).astype(np.float32)
    _audio_q.put(mono)

def _process_thread():
    max_samples = int(MAX_RING_SEC * SR)
    ring = np.zeros(max_samples, dtype=np.float32)
    write_idx, filled = 0, 0
    sos = butter(4, HIGH_PASS_HZ, btype='highpass', fs=SR, output='sos')
    energy_hist = []
    stable_counter = 0
    current_note = "Unknown"
    last_stable_note = "Unknown"

    while not _stop.is_set():
        try:
            block = _audio_q.get(timeout=0.1)
        except queue.Empty:
            continue
        block = sosfilt(sos, block)

        n = len(block)
        if n >= max_samples:
            ring[:] = block[-max_samples:]
            write_idx, filled = 0, max_samples
        else:
            end = write_idx + n
            if end <= max_samples:
                ring[write_idx:end] = block
            else:
                split = max_samples - write_idx
                ring[write_idx:] = block[:split]
                ring[:n-split] = block[split:]
            write_idx = (write_idx + n) % max_samples
            filled = min(max_samples, filled + n)

        if filled < FRAME_LENGTH:
            continue

        analysis_len = min(filled, int(0.5 * SR))
        start = (write_idx - analysis_len) % max_samples
        if start + analysis_len <= max_samples:
            y_recent = ring[start:start + analysis_len].copy()
        else:
            y_recent = np.concatenate([ring[start:], ring[:analysis_len - (max_samples - start)]])

        y_harm, _ = librosa.effects.hpss(y_recent)
        S = np.abs(librosa.stft(y_harm, n_fft=FRAME_LENGTH, hop_length=HOP_LENGTH))**2
        frame_energy = S.sum(axis=0) + 1e-12
        energy_hist.extend(frame_energy.tolist())
        if len(energy_hist) > 2000:
            energy_hist = energy_hist[-2000:]

        try:
            f0 = librosa.yin(y_harm, fmin=FMIN, fmax=FMAX, sr=SR,
                             frame_length=FRAME_LENGTH, hop_length=HOP_LENGTH)
        except Exception:
            continue

        valid = np.isfinite(f0)
        if not np.any(valid):
            stable_counter = max(0, stable_counter - 1)
            if stable_counter == 0 and current_note != "Unknown":
                last_stable_note = current_note
                current_note = "Unknown"
                with state.lock:
                    state.current_note = current_note
                    state.last_stable_note = last_stable_note
                    state.frequency = 0.0
                    state.confidence = 0.0
            continue

        fe_valid = frame_energy[valid]
        f0_valid = f0[valid]
        median_energy = np.median(energy_hist) if energy_hist else np.median(fe_valid)
        gate = max(SILENCE_THRESHOLD, median_energy * ENERGY_GATE_FACTOR)
        strong = fe_valid >= gate
        if not np.any(strong):
            stable_counter = max(0, stable_counter - 1)
            if stable_counter == 0 and current_note != "Unknown":
                last_stable_note = current_note
                current_note = "Unknown"
                with state.lock:
                    state.current_note = current_note
                    state.last_stable_note = last_stable_note
                    state.frequency = 0.0
                    state.confidence = 0.0
            continue

        f0_ke = f0_valid[strong]
        fe_ke = fe_valid[strong]

        freq_est = _weighted_median(f0_ke, fe_ke)
        mad = _weighted_mad(f0_ke, fe_ke, center=freq_est) + 1e-9
        spread_ratio = np.clip(mad / freq_est, 0, 0.5)
        confidence = (1.0 - (spread_ratio / 0.5))

        note_here = pitch_to_note(freq_est)
        if note_here == current_note:
            stable_counter += 1
        else:
            current_note = note_here
            stable_counter = 1

        if stable_counter >= MIN_STABLE_FRAMES and confidence > 0.4:
            last_stable_note = current_note
            with state.lock:
                state.current_note = current_note
                state.last_stable_note = last_stable_note
                state.frequency = float(freq_est)
                state.confidence = float(confidence * 100.0)

def start_listener():
    if _stop.is_set():
        _stop.clear()
    t_proc = threading.Thread(target=_process_thread, daemon=True)
    t_proc.start()
    stream = sd.InputStream(callback=_audio_cb, channels=1, samplerate=SR, blocksize=BLOCK_SIZE)
    stream.start()
    return stream, t_proc

def stop_listener(stream, t_proc):
    _stop.set()
    try:
        stream.stop(); stream.close()
    except Exception:
        pass
    t_proc.join(timeout=1.0)
import librosa
import librosa.display
import matplotlib.pyplot as plt
import numpy as np

# REPLACE with your exact filename
FILE = "A-2-min-chord-2.wav" 
SR = 16000

# Load and process exactly like the model does
y, _ = librosa.load(FILE, sr=SR)
cqt = librosa.cqt(y, sr=SR, hop_length=512, fmin=librosa.note_to_hz('A0'), n_bins=88, bins_per_octave=12)
cqt_db = librosa.amplitude_to_db(np.abs(cqt), ref=np.max)

plt.figure(figsize=(12, 6))
# We plot the raw CQT notes
librosa.display.specshow(cqt_db, sr=SR, x_axis='time', y_axis='cqt_note', fmin=librosa.note_to_hz('A0'))
plt.colorbar(format='%+2.0f dB')
plt.title(f"Spectrogram: Is A2 visible?")
plt.tight_layout()
plt.savefig("debug_spectrogram.png")
print("Saved 'debug_spectrogram.png'. Open it and look at the bottom!")
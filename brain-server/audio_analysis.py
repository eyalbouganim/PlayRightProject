import librosa
import numpy as np

def detect_single_note(audio_file):
    # Load audio
    y, sr = librosa.load(audio_file)

    # Get fundamental frequency (pitch)
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)

    # Find dominant pitch
    pitch = np.mean(pitches[pitches > 0])

    # Convert to note name
    note = pitch_to_note(pitch)

    return {
        'note': note,
        'frequency': float(pitch),  # Convert numpy float32 to Python float
        'confidence': calculate_confidence(magnitudes)
    }

def pitch_to_note(frequency):
    """Convert frequency to musical note name"""
    if frequency <= 0:
        return "Unknown"
    
    # A4 = 440 Hz
    A4 = 440
    C0 = A4 * np.power(2, -4.75)
    
    # Calculate note number
    note_number = round(12 * np.log2(frequency / C0))
    
    # Note names
    note_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    
    # Get note name and octave
    note_name = note_names[note_number % 12]
    octave = note_number // 12
    
    return f"{note_name}{octave}"

def calculate_confidence(magnitudes):
    """Calculate confidence score based on magnitude values"""
    if len(magnitudes) == 0:
        return 0.0
    
    # Simple confidence based on average magnitude
    avg_magnitude = np.mean(magnitudes[magnitudes > 0])
    
    # Normalize to 0-100 scale
    confidence = min(100, avg_magnitude * 1000)
    
    return float(confidence)  # Convert to Python float
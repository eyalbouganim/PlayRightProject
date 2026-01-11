import numpy as np
import librosa
from piano_transcription_inference import PianoTranscription, sample_rate

def transcribe_audio_to_midi(audio_path, output_midi_path, device='cpu'):
    """
    Uses Bytedance Piano Transcription to convert Audio -> MIDI.
    This function takes an audio file, transcribes it into piano notes,
    and saves the result as a MIDI file.
    """
    # Load the audio file, ensuring it's resampled to 16kHz and converted to mono.
    # The Bytedance model is optimized for this specific sample rate.
    audio, _ = librosa.load(audio_path, sr=sample_rate, mono=True)

    # Initialize the piano transcription model.
    # The model's checkpoint will be downloaded automatically if not present.
    transcriptor = PianoTranscription(device=device, checkpoint_path=None)

    # Perform the transcription and save the resulting MIDI to the specified path.
    transcriptor.transcribe(audio, output_midi_path)
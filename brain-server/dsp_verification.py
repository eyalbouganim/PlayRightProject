"""
brain-server/dsp_verification.py

The "No-ML" Polyphonic Verifier.
Uses Dynamic Time Warping (DTW) to align user audio to the MusicXML score.
Checks for energy at specific expected frequencies.
"""

import sys
import os
import numpy as np
import librosa
import librosa.display
from scipy.spatial.distance import cdist

# Import your existing XML parser
try:
    from audio_analysis import parse_musicxml
except ImportError:
    sys.path.append(os.path.dirname(__file__))
    from audio_analysis import parse_musicxml

# --- CONFIGURATION ---
SR = 22050
HOP_LENGTH = 512
MIN_MIDI = 21  # A0
MAX_MIDI = 108 # C8
NUM_BINS = 88  # Piano keys
NOTES_PER_OCTAVE = 12

class DspVerifier:
    def __init__(self):
        pass

    def _create_chroma_template(self, expected_notes, duration_sec):
        """
        Synthesizes a 'Perfect' Spectrogram (Chromagram) from the Sheet Music.
        This is what the audio SHOULD look like.
        """
        # Create a time grid
        frames = int(np.ceil(duration_sec * SR / HOP_LENGTH))
        # We use Chroma (12 bins: C, C#, D...) for alignment because it's robust to octave errors
        chroma_template = np.zeros((12, frames))
        
        # We also keep a full MIDI piano roll for the actual grading later
        piano_roll = np.zeros((NUM_BINS, frames))

        for note in expected_notes:
            # Parse start/end
            start_frame = int(note['start_time'] * SR / HOP_LENGTH)
            duration_frames = int(note['duration'] * SR / HOP_LENGTH)
            end_frame = min(start_frame + duration_frames, frames)
            
            if 'midi' not in note:
                # Basic lookup if MIDI missing (simplified)
                try:
                    note['midi'] = librosa.note_to_midi(note['note'])
                except:
                    continue

            # Fill Piano Roll (Specific Key)
            if MIN_MIDI <= note['midi'] <= MAX_MIDI:
                idx = note['midi'] - MIN_MIDI
                piano_roll[idx, start_frame:end_frame] = 1.0
                
                # Fill Chroma (Pitch Class)
                chroma_idx = note['midi'] % 12
                chroma_template[chroma_idx, start_frame:end_frame] = 1.0

        return chroma_template, piano_roll

    def verify(self, audio_path, xml_path):
        # 1. Load Audio
        y, _ = librosa.load(audio_path, sr=SR)
        audio_chroma = librosa.feature.chroma_cqt(y=y, sr=SR, hop_length=HOP_LENGTH)
        
        # 2. Load Score & Create Template
        expected_notes = parse_musicxml(xml_path)
        if not expected_notes:
            return {'score': 0, 'error': "Empty Score"}
        
        # Calculate approximate duration of score to size the template
        last_note_end = max([n['start_time'] + n['duration'] for n in expected_notes])
        xml_chroma, xml_piano_roll = self._create_chroma_template(expected_notes, last_note_end + 1.0)

        # 3. Dynamic Time Warping (DTW) - The Magic Alignment Step
        # This stretches the "Sheet Music" timeline to match the "User Audio" timeline
        # We align based on Chroma (harmonics) because it's robust
        D, wp = librosa.sequence.dtw(X=xml_chroma, Y=audio_chroma, metric='cosine')
        
        # wp is the "Warping Path". It maps [Template Index, Audio Index]
        # We invert it to build a map: Score_Time -> Audio_Time
        path_map = {}
        for i in range(len(wp)):
            xml_idx, audio_idx = wp[i]
            # If multiple audio frames map to one xml frame, take the average or first
            if xml_idx not in path_map:
                path_map[xml_idx] = audio_idx

        # 4. Grading: Check Energy at Aligned Locations
        # Calculate the actual CQT of audio for precise frequency checking
        cqt = np.abs(librosa.cqt(y, sr=SR, hop_length=HOP_LENGTH, 
                                fmin=librosa.note_to_hz('A0'), 
                                n_bins=NUM_BINS, bins_per_octave=NOTES_PER_OCTAVE))
        # Normalize CQT
        cqt = librosa.amplitude_to_db(cqt, ref=np.max)
        cqt = (cqt + 80.0) / 80.0 # Scale 0-1
        cqt[cqt < 0.4] = 0 # Noise gate

        hits = 0
        total_notes = 0
        details = []

        # Iterate through every note in the score
        for note in expected_notes:
            total_notes += 1
            midi_idx = note['midi'] - MIN_MIDI
            
            # Find where this note lives in the XML timeline
            start_frame_xml = int(note['start_time'] * SR / HOP_LENGTH)
            mid_frame_xml = start_frame_xml + int((note['duration'] * SR / HOP_LENGTH) / 2)
            
            # Map to AUDIO timeline using DTW path
            # We look at the middle of the note to be safe
            if mid_frame_xml in path_map:
                target_audio_frame = path_map[mid_frame_xml]
            else:
                target_audio_frame = 0 # Fallback
            
            # CHECK: Is there energy at this frequency in the audio frame?
            # We check the target bin +/- 1 neighbor (for slight tuning diffs)
            energy = 0
            if 0 <= midi_idx < NUM_BINS:
                region = cqt[max(0, midi_idx-1):min(NUM_BINS, midi_idx+2), target_audio_frame]
                energy = np.max(region)

            is_hit = energy > 0.5 # Threshold (tunable)
            
            if is_hit:
                hits += 1
                status = "correct"
            else:
                status = "missed"

            details.append({
                'note': note['note'],
                'expected_time': round(note['start_time'], 2),
                'aligned_audio_time': round(target_audio_frame * HOP_LENGTH / SR, 2),
                'energy_detected': round(float(energy), 2),
                'status': status
            })

        # 5. Final Calculation
        score = (hits / total_notes) * 100 if total_notes > 0 else 0
        
        return {
            'overall_score': round(score, 1),
            'correct_notes': hits,
            'total_notes': total_notes,
            'details': details
        }

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio', required=True)
    parser.add_argument('--xml', required=True)
    args = parser.parse_args()

    verifier = DspVerifier()
    print("Aligning and Verifying...")
    result = verifier.verify(args.audio, args.xml)
    
    print("\n" + "="*40)
    print(f"SCORE: {result['overall_score']}%")
    print("="*40)
    for d in result['details']:
        icon = "✅" if d['status'] == "correct" else "❌"
        print(f"{icon} {d['note']} (Exp: {d['expected_time']}s -> Act: {d['aligned_audio_time']}s) Energy: {d['energy_detected']}")
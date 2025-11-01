"""
Main entry point for audio analysis
"""

import sys
import json
import argparse
import os

# Add parent directory to path to allow imports when run directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from note_detection import detect_notes_improved
from musicxml_parser import parse_musicxml
from alignment import align_and_compare
from utils import make_json_serializable


def main():
    """
    Main analysis function
    """
    # Use argparse for proper command-line argument parsing
    parser = argparse.ArgumentParser(description='Analyze audio performance')
    parser.add_argument('--audio-path', required=True, help='Path to audio file')
    parser.add_argument('--song-id', required=True, help='Song identifier')
    parser.add_argument('--musicxml-path', default=None, help='Path to MusicXML file')
    parser.add_argument('--tempo', type=int, default=120, help='Tempo in BPM')
    parser.add_argument('--timing-tolerance', type=float, default=0.3, help='Timing tolerance in seconds')
    
    args = parser.parse_args()
    
    audio_path = args.audio_path
    song_id = args.song_id
    musicxml_path_arg = args.musicxml_path # Get path from arguments
    tempo = args.tempo
    timing_tolerance = args.timing_tolerance
    
    # Determine the MusicXML path based on song_id
    musicxml_path = musicxml_path_arg # Prioritize the direct path from the argument
    if not musicxml_path:
        if song_id and song_id == 'default':
                # Path to the default MusicXML file within the brain-server directory
                musicxml_path = os.path.join(os.path.dirname(__file__), '../assets/twinkle_twinkle.musicxml')
                print(f"--- Using default MusicXML for comparison: {musicxml_path} ---", file=sys.stderr)
    
    if musicxml_path:
        print(f"--- Final MusicXML path for analysis: {musicxml_path} ---", file=sys.stderr)


    # Detect notes with improved algorithm
    detected_notes = detect_notes_improved(audio_path, sample_rate=22050, min_db=-38)
    
    output = {
        'playedNotes': detected_notes,
        'totalNotes': len(detected_notes)
    }
    
    # Compare with MusicXML if provided
    if musicxml_path:
        if os.path.exists(musicxml_path):
            print("--- Comparing with MusicXML ---", file=sys.stderr)
            expected_notes = parse_musicxml(musicxml_path, tempo)
            
            if expected_notes:
                comparison = align_and_compare(detected_notes, expected_notes, timing_tolerance)
                output['comparison'] = comparison
                
                print(f"--- Pitch Accuracy: {comparison['pitch_accuracy']}% ---", file=sys.stderr)
                print(f"--- Timing Accuracy: {comparison['timing_accuracy']}% ---", file=sys.stderr)
                print(f"--- Overall Score: {comparison['overall_score']}% ---", file=sys.stderr)
        else:
            print(f"--- ERROR: MusicXML file not found at path: {musicxml_path} ---", file=sys.stderr)
    
    # Make sure everything is JSON serializable
    output = make_json_serializable(output)
    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
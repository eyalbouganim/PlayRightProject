"""
Audio Analysis Package for Piano Performance Evaluation
"""

from pitch_detection import detect_pitch_robust, freq_to_note, get_piano_notes, PIANO_NOTES
from note_detection import detect_notes_improved
from musicxml_parser import parse_musicxml
from alignment import align_and_compare, normalize_note_name
from utils import make_json_serializable

__all__ = [
    'detect_pitch_robust',
    'freq_to_note',
    'get_piano_notes',
    'PIANO_NOTES',
    'detect_notes_improved',
    'parse_musicxml',
    'align_and_compare',
    'normalize_note_name',
    'make_json_serializable'
]
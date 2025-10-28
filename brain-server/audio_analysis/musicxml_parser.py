"""
MusicXML parsing for expected note sequences
"""

import sys
import xml.etree.ElementTree as ET


def parse_musicxml(xml_path, tempo=120):
    """
    Parse MusicXML file to extract expected notes with timing
    """
    print(f"--- Parsing MusicXML: {xml_path} ---", file=sys.stderr)
    
    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception as e:
        print(f"--- Error parsing MusicXML: {e} ---", file=sys.stderr)
        return []
    
    # Find namespace
    ns = {'': 'http://www.musicxml.org/xsd/musicxml'}
    if root.tag.startswith('{'):
        ns_url = root.tag.split('}')[0].strip('{')
        ns = {'': ns_url}
    
    expected_notes = []
    current_time = 0.0
    divisions = 1  # Default divisions per quarter note
    
    # Iterate through all parts (piano, guitar, or something else)
    for part in root.findall('.//part', ns) or root.findall('.//part'):
        current_time = 0.0
        
        # Going through every notes box (Teiva ba-tavim)
        for measure in part.findall('.//measure', ns) or part.findall('.//measure'):
            # Check for divisions (timing resolution)
            attributes = measure.find('.//attributes', ns) or measure.find('.//attributes')
            if attributes is not None:
                div_elem = attributes.find('.//divisions', ns) or attributes.find('.//divisions')
                if div_elem is not None and div_elem.text:
                    divisions = int(div_elem.text)
            
            # Process notes
            for note_elem in measure.findall('.//note', ns) or measure.findall('.//note'):
                # Check if it's a rest
                if note_elem.find('.//rest', ns) is not None or note_elem.find('.//rest') is not None:
                    duration_elem = note_elem.find('.//duration', ns) or note_elem.find('.//duration')
                    if duration_elem is not None and duration_elem.text:
                        duration_divisions = int(duration_elem.text)
                        duration_quarters = duration_divisions / divisions
                        duration_seconds = (duration_quarters * 60.0) / tempo
                        current_time += duration_seconds
                    continue
                
                # Get pitch
                pitch_elem = note_elem.find('.//pitch', ns) or note_elem.find('.//pitch')
                if pitch_elem is None:
                    continue
                
                step_elem = pitch_elem.find('.//step', ns) or pitch_elem.find('.//step')
                octave_elem = pitch_elem.find('.//octave', ns) or pitch_elem.find('.//octave')
                alter_elem = pitch_elem.find('.//alter', ns) or pitch_elem.find('.//alter')
                
                if step_elem is None or octave_elem is None:
                    continue
                
                step = step_elem.text
                octave = octave_elem.text
                alter = alter_elem.text if alter_elem is not None else None
                
                # Build note name
                note_name = step
                if alter == '1':
                    note_name += '#'
                elif alter == '-1':
                    note_name += 'b'
                
                note_name += octave
                
                # Get duration
                duration_elem = note_elem.find('.//duration', ns) or note_elem.find('.//duration')
                if duration_elem is not None and duration_elem.text:
                    duration_divisions = int(duration_elem.text)
                    duration_quarters = duration_divisions / divisions
                    duration_seconds = (duration_quarters * 60.0) / tempo
                else:
                    duration_seconds = 0.5  # Default
                
                expected_notes.append({
                    'note': note_name,
                    'start_time': current_time,
                    'duration': duration_seconds
                })
                
                # Check if it's a chord (doesn't advance time)
                chord_elem = note_elem.find('.//chord', ns) or note_elem.find('.//chord')
                if chord_elem is None:
                    current_time += duration_seconds
    
    print(f"--- Parsed {len(expected_notes)} expected notes from MusicXML ---", file=sys.stderr)
    return expected_notes

// src/utils/musicXMLParser.js

/**
 * Parses MusicXML and extracts a flat array of notes for gameplay
 * @param {string} musicXML - The MusicXML string
 * @returns {Array} Array of note objects: [{ name: 'C4' }, { name: 'D4' }, ...]
 */
export const parseMusicXMLToNotes = (musicXML) => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(musicXML, "text/xml");
    
    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        throw new Error('Invalid MusicXML format');
    }

    const notes = [];
    
    // Try to find all parts in the score
    const parts = xmlDoc.querySelectorAll('part');
    
    if (parts.length === 0) {
        console.error('No parts found in MusicXML');
        throw new Error('No parts found in MusicXML');
    }

    // Process the first part (or you can process all parts if needed)
    const firstPart = parts[0];
    const noteElements = firstPart.querySelectorAll('note');

    console.log(`Found ${noteElements.length} note elements in MusicXML`);

    noteElements.forEach((noteElement, index) => {
        // Skip rests
        const isRest = noteElement.querySelector('rest');
        if (isRest) {
            console.log(`Note ${index}: REST (skipped)`);
            return;
        }

        // Skip chord notes (notes that are part of a chord, not the first note)
        const isChord = noteElement.querySelector('chord');
        if (isChord) {
            console.log(`Note ${index}: CHORD (skipped)`);
            return;
        }

        // Extract pitch information
        const pitch = noteElement.querySelector('pitch');
        if (!pitch) {
            console.log(`Note ${index}: No pitch found (skipped)`);
            return;
        }

        const step = pitch.querySelector('step')?.textContent;
        const octave = pitch.querySelector('octave')?.textContent;
        const alter = pitch.querySelector('alter')?.textContent; // For sharps/flats

        if (!step || !octave) {
            console.log(`Note ${index}: Missing step or octave (skipped)`);
            return;
        }

        // Build note name (e.g., "C4", "F#4", "Bb4")
        let noteName = step;
        if (alter) {
            noteName += alter === '1' ? '#' : (alter === '-1' ? 'b' : '');
        }
        noteName += octave;

        console.log(`Note ${index}: ${noteName}`);
        notes.push({ name: noteName });
    });

    console.log(`Total playable notes extracted: ${notes.length}`, notes);
    return notes;
};

/**
 * Validates if MusicXML is well-formed
 */
export const validateMusicXML = (musicXML) => {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(musicXML, "text/xml");
        const parserError = xmlDoc.querySelector('parsererror');
        return !parserError;
    } catch (e) {
        return false;
    }
};
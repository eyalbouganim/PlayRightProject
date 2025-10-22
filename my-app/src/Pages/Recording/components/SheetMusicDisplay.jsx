import React, { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay, Cursor } from 'opensheetmusicdisplay';
import './SheetMusicDisplay.css';

// --- (sampleMusicXML remains the same) ---
const sampleMusicXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note></measure><measure number="2"><note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><type>quarter</type></note><barline location="right"><bar-style>light-heavy</bar-style></barline></measure></part></score-partwise>`;

const SheetMusicDisplay = ({ currentTargetNoteIndex }) => {
    const osmdContainerRef = useRef(null);
    const osmdRef = useRef(null);
    const cursorRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [osmdRendered, setOsmdRendered] = useState(false); // Changed state name for clarity

    // Effect 1: Initialize OSMD and Render Score
    useEffect(() => {
        if (!osmdContainerRef.current || osmdRef.current) return;

        console.log("Initializing OSMD...");
        osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current, {
            autoResize: true,
            backend: "svg",
            drawTitle: true,
        });

        osmdRef.current.load(sampleMusicXML)
            .then(() => {
                console.log("OSMD Load successful, rendering...");
                // Render returns a Promise, wait for it if necessary in some OSMD versions
                return osmdRef.current.render();
            })
            .then(() => {
                // Now rendering should be fully complete
                console.log("OSMD rendered.");
                setIsLoading(false);
                setOsmdRendered(true); // Signal that rendering is done
            })
            .catch((e) => {
                setError("Error rendering sheet music.");
                setIsLoading(false);
                console.error("OSMD Load/Render Error:", e);
            });

    }, []); // Runs only once on mount

// Effect 2: Initialize Cursor *after* OSMD has rendered
useEffect(() => {
    let animationFrameId;

    // Only run if OSMD rendering is done AND the cursor hasn't been created yet
    if (osmdRendered && osmdContainerRef.current && osmdRef.current && !cursorRef.current) {
        console.log("OSMD has rendered, scheduling cursor initialization...");

        // Use rAF to ensure browser paint is done
        animationFrameId = requestAnimationFrame(() => {
            console.log("Inside rAF: Checking OSMD readiness for cursor...");
            try {
                // ** CRUCIAL CHECK: Ensure GraphicSheet exists **
                // GraphicSheet is a core object needed for cursor iteration
                if (osmdRef.current && osmdRef.current.GraphicSheet) {
                    console.log("OSMD GraphicSheet found. Initializing cursor...");
                    // FIX: Pass only the OSMD instance, not the container
                    cursorRef.current = osmdRef.current.cursor;
                    cursorRef.current.show();
                    console.log("Cursor initialized and shown via rAF.");
                } else {
                     // If GraphicSheet isn't ready even after rAF, something is wrong
                     console.error("OSMD GraphicSheet not ready within rAF. Cursor cannot be initialized.");
                     setError("Failed to initialize cursor: OSMD internal state not ready.");
                }
            } catch (e) {
                 setError(`Error initializing cursor: ${e.message}`);
                 console.error("Cursor Initialization Error inside rAF:", e);
            }
        });
    }

    return () => {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };
}, [osmdRendered]);

    // Effect 3: Move Cursor when index changes
    useEffect(() => {
        // Only move cursor if it exists and the index is valid
        if (cursorRef.current && osmdRendered && currentTargetNoteIndex >= 0) {
            console.log(`Received index update: ${currentTargetNoteIndex}`);
            try {
                cursorRef.current.reset();
                for (let i = 0; i < currentTargetNoteIndex; i++) {
                    if (!cursorRef.current.iterator.EndReached) {
                        cursorRef.current.next();
                    } else {
                        break;
                    }
                }
                // Determine show/hide based on note count (safer check)
                 const noteCount = osmdRef.current?.GraphicSheet?.SourceMeasures
                                   ?.flatMap(m => m.SourceNotes?.filter(n => !n.isRest()))?.length ?? 0;
                 if (currentTargetNoteIndex >= noteCount && noteCount > 0) {
                      cursorRef.current.hide();
                 } else {
                      cursorRef.current.show();
                 }

            } catch (e) {
                console.error("Error moving cursor:", e);
            }
        }
    }, [currentTargetNoteIndex, osmdRendered]); // Also depend on osmdRendered


    return (
        <div className="sheet-music-display-container">
            {isLoading && <p>Loading Sheet Music...</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div ref={osmdContainerRef} />
        </div>
    );
};

export default SheetMusicDisplay;
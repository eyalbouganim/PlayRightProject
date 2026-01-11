import React, { useEffect, useRef, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';

const SheetMusicDisplay = ({ musicXML, currentTargetNoteIndex, bpm, isPlaying, onCursorUpdate }) => {
    const osmdContainerRef = useRef(null);
    const osmdRef = useRef(null);
    const cursorRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [osmdRendered, setOsmdRendered] = useState(false);

    // Effect 1: Initialize OSMD and Render Score
    useEffect(() => {
        if (!osmdContainerRef.current || !musicXML) return;

        // Clean up previous instance completely
        if (osmdRef.current) {
            try {
                osmdRef.current.clear();
            } catch (e) {
                console.warn("Error clearing OSMD:", e);
            }
            osmdRef.current = null;
        }
        
        // Reset cursor reference
        cursorRef.current = null;
        setOsmdRendered(false);
        setIsLoading(true);
        setError(null);

        console.log("Initializing OSMD with new MusicXML...");
        
        osmdRef.current = new OpenSheetMusicDisplay(osmdContainerRef.current, {
            autoResize: true,
            backend: "svg",
            drawTitle: true,
            drawingParameters: "default",
        });

        osmdRef.current.load(musicXML)
            .then(() => {
                console.log("OSMD Load successful, rendering...");
                osmdRef.current.zoom = 1.3;
                return osmdRef.current.render();
            })
            .then(() => {
                console.log("OSMD render() completed.");
                
                // Use setTimeout to ensure OSMD internal structure is fully ready
                setTimeout(() => {
                    // Debug: Count notes in OSMD
                    if (osmdRef.current && osmdRef.current.GraphicSheet) {
                        const measures = osmdRef.current.GraphicSheet.SourceMeasures;
                        console.log("Measures:", measures);
                        
                        const osmdNoteCount = measures
                            ?.flatMap(m => m.SourceNotes?.filter(n => !n.isRest()))?.length ?? 0;
                        console.log(`OSMD detected ${osmdNoteCount} notes in the sheet music`);
                    } else {
                        console.error("GraphicSheet not available");
                    }
                    
                    setIsLoading(false);
                    setOsmdRendered(true);
                }, 100); // Small delay to ensure everything is ready
            })
            .catch((e) => {
                setError("Error rendering sheet music.");
                setIsLoading(false);
                console.error("OSMD Load/Render Error:", e);
            });

        return () => {
            if (osmdRef.current) {
                try {
                    osmdRef.current.clear();
                } catch (e) {
                    console.warn("Cleanup error:", e);
                }
            }
        };
    }, [musicXML]);

    // Effect 2: Initialize Cursor after OSMD has rendered
    useEffect(() => {
        let timeoutId;

        if (osmdRendered && osmdRef.current && !cursorRef.current) {
            console.log("OSMD has rendered, initializing cursor...");

            // Use setTimeout instead of rAF for more reliable timing
            timeoutId = setTimeout(() => {
                try {
                    if (osmdRef.current && osmdRef.current.cursor) {
                        console.log("Initializing cursor...");
                        cursorRef.current = osmdRef.current.cursor;
                        cursorRef.current.reset();
                        cursorRef.current.show();
                        console.log("✓ Cursor initialized and shown successfully!");
                        
                        // Verify cursor is at the right position
                        console.log("Cursor iterator exists:", !!cursorRef.current.iterator);
                    } else {
                        console.error("OSMD cursor not available.");
                        console.log("OSMD ref exists:", !!osmdRef.current);
                        console.log("Cursor exists:", !!osmdRef.current?.cursor);
                        setError("Failed to initialize cursor.");
                    }
                } catch (e) {
                    setError(`Error initializing cursor: ${e.message}`);
                    console.error("Cursor Initialization Error:", e);
                }
            }, 150); // Slightly longer delay
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        };
    }, [osmdRendered]);

    // Effect 3: Move Cursor when index changes
    useEffect(() => {
        let timerId;
        if (!cursorRef.current || !osmdRendered || currentTargetNoteIndex < 0) {
            console.log('Cursor movement skipped:', {
                hasCursor: !!cursorRef.current,
                osmdRendered,
                currentTargetNoteIndex
            });
            return;
        }

        console.log(`\n=== Moving cursor to note index: ${currentTargetNoteIndex} ===`);
        
        try {
            // Reset cursor to beginning
            cursorRef.current.reset();
            console.log('Cursor reset to start');
            
            // Verify iterator is ready
            if (!cursorRef.current.iterator) {
                console.error("Cursor iterator not available!");
                return;
            }
            
            // Move cursor to the target note
            let moveCount = 0;
            for (let i = 0; i < currentTargetNoteIndex; i++) {
                if (cursorRef.current.iterator && !cursorRef.current.iterator.EndReached) {
                    cursorRef.current.next();
                    moveCount++;
                } else {
                    console.log(`Reached end of score at move ${moveCount}`);
                    break;
                }
            }
            
            console.log(`Cursor moved ${moveCount} times to reach index ${currentTargetNoteIndex}`);

            // Show/hide cursor based on position
            if (cursorRef.current.iterator && cursorRef.current.iterator.EndReached) {
                console.log('Hiding cursor (reached end)');
                cursorRef.current.hide();
            } else {
                console.log('Showing cursor');
                cursorRef.current.show();
            }
            
            console.log('=== Cursor movement complete ===\n');

            // Auto-advance cursor based on BPM
            if (isPlaying && onCursorUpdate && cursorRef.current.iterator && !cursorRef.current.iterator.EndReached) {
                const iterator = cursorRef.current.iterator;
                let duration = 0;

                if (iterator.CurrentVoiceEntries && iterator.CurrentVoiceEntries.length > 0) {
                    const voiceEntry = iterator.CurrentVoiceEntries[0];
                    if (voiceEntry.Notes && voiceEntry.Notes.length > 0) {
                        // OSMD RealValue: Whole = 1.0, Quarter = 0.25
                        const noteLength = voiceEntry.Notes[0].Length.RealValue;
                        // Convert to beats (Quarter notes)
                        const beats = noteLength * 4;
                        // Calculate seconds: beats * (60 / bpm)
                        const safeBpm = bpm || 120;
                        duration = beats * (60 / safeBpm);
                    }
                }

                if (duration > 0) {
                    timerId = setTimeout(() => {
                        onCursorUpdate(currentTargetNoteIndex + 1);
                    }, duration * 1000);
                }
            }
        } catch (e) {
            console.error("Error moving cursor:", e);
        }
        return () => clearTimeout(timerId);
    }, [currentTargetNoteIndex, osmdRendered, isPlaying, bpm, onCursorUpdate]);

    return (
        <Box sx={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {isLoading && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, width: '100%' }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Loading Sheet Music...</Typography>
                </Box>
            )}
            {error && (
                <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
            )}
            <Box
                ref={osmdContainerRef}
                sx={{
                    flexGrow: 1,
                    visibility: isLoading || error ? 'hidden' : 'visible',
                    bgcolor: 'white', // Set the background of the sheet music to white
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    width: '100%'
                }}
            />
        </Box>
    );
};

export default SheetMusicDisplay;
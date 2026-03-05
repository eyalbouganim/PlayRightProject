// src/Pages/Recording/components/RecordingScore.jsx
import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const midiToNoteName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

const RecordingScore = ({ performanceResults }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Handle both the new object format and potential legacy array format
  const { alignment, grade, breakdown } = performanceResults?.alignment ? performanceResults : { alignment: performanceResults };
  const notes = alignment || [];

  useEffect(() => {
    if (!notes || notes.length === 0 || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // --- VISUALIZATION CONFIG ---
    const PIXELS_PER_SECOND = 120; // Horizontal Zoom (Bigger)
    const NOTE_HEIGHT = 20;        // Vertical Key Height (Bigger)
    
    // Determine Range dynamically based on the notes played
    const pitches = notes.map(n => n.pitch);
    const minPitch = Math.min(...pitches) - 2; // Add padding
    const maxPitch = Math.max(...pitches) + 2;
    const pitchRange = maxPitch - minPitch;

    const maxTime = Math.max(...notes.map(n => n.end)) + 1;
    
    // Set Dimensions
    const width = maxTime * PIXELS_PER_SECOND;
    const height = pitchRange * NOTE_HEIGHT;
    
    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 1. Draw Background (Dark Theme)
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, width, height);
    
    // 2. Draw Grid Lines (Rows)
    ctx.strokeStyle = '#34495e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= pitchRange; i++) {
      const y = i * NOTE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3. Draw Notes
    notes.forEach(note => {
      // Invert Y axis: Higher pitch should be higher up (Lower Y value)
      const pitchOffset = maxPitch - note.pitch; 
      
      const x = note.start * PIXELS_PER_SECOND;
      const y = pitchOffset * NOTE_HEIGHT;
      const w = Math.max((note.end - note.start) * PIXELS_PER_SECOND, 5); // Min width 5px
      const h = NOTE_HEIGHT - 1; // Gap between keys

      // --- UPDATED COLOR LOGIC (Backend Driven) ---
      let color = '#e74c3c';       // Red (Default/Missed)
      let strokeColor = '#c0392b';

      // The frontend now relies on the 'quality' tag calculated by the backend
      // 'perfect', 'ok', 'bad', or 'missed'
      if (note.quality === 'perfect') {
        color = '#2ecc71';         // Green (Perfect)
        strokeColor = '#27ae60';
      } else if (note.quality === 'ok') {
        color = '#f1c40f';         // Yellow (Okay)
        strokeColor = '#f39c12';
      } else if (note.quality === 'bad') {
        color = '#e67e22';         // Orange (Sloppy/Bad Timing)
        strokeColor = '#d35400';
      }
      
      // Safety check: if is_played is false, force Red regardless of quality tag
      if (!note.is_played) {
        color = '#e74c3c'; 
        strokeColor = '#c0392b';
      }

      // Draw Note Bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      
      // Draw Border
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // --- LABEL LOGIC ---
      const noteName = midiToNoteName(note.pitch);

      let qualityLabel = '';
      if (note.is_played) {
        if (note.quality === 'perfect') {
          qualityLabel = `${Math.round(Math.abs(note.timing_deviation) * 1000)}ms`;
        } else {
          qualityLabel = note.timing_status === 'early' ? 'EARLY' : 'LATE';
        }
      }

      // Always draw at least the note name if the bar is wide enough
      if (w > 18) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Arial';
        const label = qualityLabel && w > 60 ? `${noteName} ${qualityLabel}` : noteName;
        ctx.fillText(label, x + 4, y + 13);
      }
    });

  }, [notes]);

  if (!notes || notes.length === 0) return <Typography>No alignment data available.</Typography>;

  return (
    <Box sx={{ width: '100%' }}>
        {/* Score Display */}
        {grade !== undefined && (
            <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h3" color="primary.main" fontWeight="800">{grade}%</Typography>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ letterSpacing: 1 }}>OVERALL</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="text.primary" fontWeight="700">{breakdown?.pitch}%</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">PITCH</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="text.primary" fontWeight="700">{breakdown?.timing}%</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">TIMING</Typography>
                </Box>
            </Box>
        )}

        <Box sx={{ width: '100%', overflowX: 'auto', bgcolor: '#2c3e50', borderRadius: 2, p: 1, border: '1px solid #ddd' }}>
        <div ref={containerRef}>
            <canvas ref={canvasRef} />
        </div>
        {/* UPDATED LEGEND to match dynamic grading */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#2ecc71' }}>■ Perfect</Typography>
            <Typography variant="caption" sx={{ color: '#f1c40f' }}>■ Okay</Typography>
            <Typography variant="caption" sx={{ color: '#e67e22' }}>■ Imprecise</Typography>
            <Typography variant="caption" sx={{ color: '#e74c3c' }}>■ Missed</Typography>
        </Box>
    </Box>
    </Box>
  );
};

export default RecordingScore;
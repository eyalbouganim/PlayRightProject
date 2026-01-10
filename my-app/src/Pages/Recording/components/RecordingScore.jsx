// src/Pages/Recording/components/RecordingScore.jsx
import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';

const RecordingScore = ({ performanceResults }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!performanceResults || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    
    // --- VISUALIZATION CONFIG ---
    const PIXELS_PER_SECOND = 100; // Horizontal Zoom
    const NOTE_HEIGHT = 12;        // Vertical Key Height
    
    // Determine Range dynamically based on the notes played
    const pitches = performanceResults.map(n => n.pitch);
    const minPitch = Math.min(...pitches) - 2; // Add padding
    const maxPitch = Math.max(...pitches) + 2;
    const pitchRange = maxPitch - minPitch;

    const maxTime = Math.max(...performanceResults.map(n => n.end)) + 1;
    
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
    performanceResults.forEach(note => {
      // Invert Y axis: Higher pitch should be higher up (Lower Y value)
      const pitchOffset = maxPitch - note.pitch; 
      
      const x = note.start * PIXELS_PER_SECOND;
      const y = pitchOffset * NOTE_HEIGHT;
      const w = Math.max((note.end - note.start) * PIXELS_PER_SECOND, 5); // Min width 5px
      const h = NOTE_HEIGHT - 1; // Gap between keys

      // Color Logic
      let color = '#2ecc71'; // Green (Correct)
      let strokeColor = '#27ae60';

      if (!note.is_played) {
        color = '#e74c3c'; // Red (Missed)
        strokeColor = '#c0392b';
      } else if (note.timing_deviation > 0.15) {
        color = '#f1c40f'; // Yellow (Late/Early)
        strokeColor = '#f39c12';
      }

      // Draw Note Bar
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      
      // Draw Border
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      // Draw Labels (Pitch Name or Deviation)
      if (w > 30) {
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        const label = note.is_played 
            ? `${Math.round(note.timing_deviation * 1000)}ms` 
            : 'MISS';
        ctx.fillText(label, x + 2, y + 9);
      }
    });

  }, [performanceResults]);

  if (!performanceResults) return <Typography>No alignment data available.</Typography>;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto', bgcolor: '#2c3e50', borderRadius: 2, p: 1, border: '1px solid #ddd' }}>
        <div ref={containerRef}>
            <canvas ref={canvasRef} />
        </div>
        <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center' }}>
            <Typography variant="caption" sx={{ color: '#2ecc71' }}>■ Correct</Typography>
            <Typography variant="caption" sx={{ color: '#f1c40f' }}>■ Imprecise (&gt;150ms)</Typography>
            <Typography variant="caption" sx={{ color: '#e74c3c' }}>■ Missed</Typography>
        </Box>
    </Box>
  );
};

export default RecordingScore;
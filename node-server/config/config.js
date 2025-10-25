const path = require('path');

module.exports = {
    // Server configuration
    server: {
        port: process.env.PORT || 3001,
        host: process.env.HOST || 'localhost'
    },
    
    // WebSocket configuration
    websocket: {
        pingInterval: 30000, // 30 seconds
        maxConnections: 100
    },
    
    // Python configuration
    python: {
        scriptPath: path.join(__dirname, '../../brain-server/streaming_analysis.py'),
        analysisScriptPath: path.join(__dirname, '../../brain-server/audio_analysis/main.py'),
        executable: '/home/eyalb1380/PlayRightProject/brain-server/venv/bin/python3',
        timeout: 30000 // 30 seconds
    },
    
    // Audio configuration
    audio: {
        sampleRate: 22050,
        bufferDuration: 3.0,
        minDb: -30
    },
    
    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info', // 'debug', 'info', 'warn', 'error'
        enableColors: true
    }
};
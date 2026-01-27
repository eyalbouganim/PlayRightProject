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
        // In Docker: /app/brain-server/streaming_analysis.py (mounted via volume)
        // Locally: ../../brain-server/streaming_analysis.py (relative to config dir)
        scriptPath: process.env.STREAMING_SCRIPT_PATH || path.join(__dirname, '../../brain-server/streaming_analysis.py'),
        analysisScriptPath: path.join(__dirname, '../../brain-server/audio_analysis/main.py'),
        executable: process.env.PYTHON_PATH || '/home/eyalb1380/PlayRightProject/brain-server/venv/bin/python3',
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
    },

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your_super_secret_key_that_is_long_and_random',
        expiresIn: '1h' // Token expiration time
    }
};
const express = require('express');
const WebSocket = require('ws');
const config = require('./config/config');
const audioController = require('./controllers/audioController');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeSessions: audioController.getActiveSessionCount(),
        timestamp: new Date().toISOString()
    });
});

// Create HTTP server
const server = app.listen(config.server.port, () => {
    logger.server(`Server running on http://${config.server.host}:${config.server.port}`);
    logger.audio('WebSocket ready for audio streaming');
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws) => {
    audioController.handleConnection(ws);
});

// Graceful shutdown
const shutdown = () => {
    logger.info('Shutting down server...');
    
    // Close WebSocket server
    wss.clients.forEach(client => {
        client.close();
    });
    
    // Cleanup sessions
    audioController.cleanup();
    
    // Close HTTP server
    server.close(() => {
        logger.success('Server closed gracefully');
        process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});

logger.info('Waiting for connections...');
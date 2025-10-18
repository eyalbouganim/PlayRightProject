const express = require('express');
const WebSocket = require('ws');
const health = require('./routes/health');
const score = require('./routes/score');
const config = require('./config/config');
const audioController = require('./controllers/audioController');
const logger = require('./utils/logger');

// Import the database connection instance
const sequelize = require('./config/database'); 
// Import your models here so Sequelize knows about them
const User = require('./models/userModel');
// (Add other models like Song, Performance here as you create them)

const app = express();

// Middleware
app.use(express.json());

// For now
app.get('/', (req, res) => {
    res.json({ message: 'Node Audio Server is running' });
});

// Routes
app.use('/health', health);
app.use('/api/score', score);

// Define server and wss here so they are accessible by the shutdown function
let server;
let wss;

// Create an async function to start the server
const startServer = async () => {
    try {
        // It connects to the DB and creates/alters tables to match your models.
        await sequelize.sync({ alter: true });
        logger.success('✔️ All models were synchronized successfully.');

        // Create HTTP server
        server = app.listen(config.server.port, () => {
            logger.server(`Server running on http://${config.server.host}:${config.server.port}`);
            logger.audio('WebSocket ready for audio streaming');
        });

        // Create WebSocket server
        wss = new WebSocket.Server({ server });

        // Handle WebSocket connections
        wss.on('connection', (ws) => {
            audioController.handleConnection(ws);
        });

        logger.info('Waiting for connections...');

    } catch (error) {
        logger.error('❌ Unable to sync models with the database:', error);
        process.exit(1); // Exit if DB sync fails
    }
};

// Graceful shutdown
const shutdown = () => {
    logger.info('Shutting down server...');
    
    // Close WebSocket server
    if (wss) { // Check if wss was initialized
        wss.clients.forEach(client => {
            client.close();
        });
    }
    
    // Cleanup sessions
    audioController.cleanup();
    
    // Close HTTP server
    if (server) { // Check if server was initialized
        server.close(() => {
            logger.success('Server closed gracefully');
            sequelize.close(); // NEW: Close the database connection
            process.exit(0);
        });
    }
    
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

// Start the server
startServer();
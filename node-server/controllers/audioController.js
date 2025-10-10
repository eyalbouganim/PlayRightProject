const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const AudioSession = require('../models/AudioSession');
const pythonService = require('../services/pythonService');
const logger = require('../utils/logger');

class AudioController {
    constructor() {
        this.sessions = new Map();
    }
    
    /**
     * Handle new WebSocket connection
     * @param {WebSocket} ws - WebSocket connection
     */
    handleConnection(ws) {
        const sessionId = uuidv4();
        const session = new AudioSession(sessionId, ws);
        this.sessions.set(sessionId, session);
        
        logger.client(`New connection: ${sessionId} (Total: ${this.sessions.size})`);
        
        // Spawn Python process
        const pythonProcess = pythonService.spawnProcess(sessionId);
        session.setPythonProcess(pythonProcess);
        
        // Set up Python output handler
        this._setupPythonHandlers(session, pythonProcess);
        
        // Set up WebSocket handlers
        this._setupWebSocketHandlers(session, ws);
        
        return sessionId;
    }
    
    /**
     * Set up Python process handlers
     * @private
     */
    _setupPythonHandlers(session, pythonProcess) {
        let buffer = '';
        
        // Handle Python stdout
        pythonProcess.stdout.on('data', (data) => {
            buffer += data.toString();
            
            // Process complete JSON lines
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer
            
            lines.forEach(line => {
                if (line.trim()) {
                    this._handlePythonOutput(session, line);
                }
            });
        });
        
        // Handle Python stderr
        pythonProcess.stderr.on('data', (data) => {
            logger.error(`Python error (${session.sessionId}):`, data.toString());
            this._sendToClient(session, {
                type: 'error',
                message: 'Python processing error',
                details: data.toString()
            });
        });
        
        // Handle Python process exit
        pythonProcess.on('close', (code) => {
            logger.python(`Python process exited (${session.sessionId}) with code ${code}`);
            if (session.isActive) {
                this._sendToClient(session, {
                    type: 'error',
                    message: 'Python process terminated unexpectedly'
                });
            }
        });
    }
    
    /**
     * Handle Python output
     * @private
     */
    _handlePythonOutput(session, line) {
        try {
            const result = JSON.parse(line);
            
            // Check if Python is ready
            if (result.status === 'ready') {
                session.setPythonReady(true);
                this._sendToClient(session, {
                    type: 'status',
                    message: 'Ready to receive audio',
                    sessionId: session.sessionId
                });
            } 
            else if (result.status === 'reset') {
                session.reset();
                this._sendToClient(session, {
                    type: 'status',
                    message: 'Session reset'
                });
            }
            else {
                // Forward result to client
                this._sendToClient(session, result);
                
                // Track notes
                if (result.type === 'notes' && result.notes && result.notes.length > 0) {
                    session.addNotes(result.notes);
                    const noteNames = result.notes.map(n => n.note).join(', ');
                    logger.note(`Detected ${result.notes.length} note(s): ${noteNames}`);
                }
            }
        } catch (err) {
            logger.error(`Failed to parse Python output (${session.sessionId}):`, line);
        }
    }
    
    /**
     * Set up WebSocket handlers
     * @private
     */
    _setupWebSocketHandlers(session, ws) {
        // Handle messages from client
        ws.on('message', (message) => {
            this._handleClientMessage(session, message);
        });
        
        // Handle client disconnect
        ws.on('close', () => {
            this._handleDisconnect(session);
        });
        
        // Handle WebSocket errors
        ws.on('error', (error) => {
            logger.error(`WebSocket error (${session.sessionId}):`, error);
        });
    }
    
    /**
     * Handle message from client
     * @private
     */
    _handleClientMessage(session, message) {
        try {
            const data = JSON.parse(message);
            
            // Check if Python is ready (except for ping)
            if (!session.pythonReady && data.type !== 'ping') {
                this._sendToClient(session, {
                    type: 'error',
                    message: 'Python not ready yet'
                });
                return;
            }
            
            switch (data.type) {
                case 'audio_chunk':
                    this._handleAudioChunk(session, data);
                    break;
                    
                case 'get_all_notes':
                    this._handleGetAllNotes(session);
                    break;
                    
                case 'reset':
                    this._handleReset(session);
                    break;
                    
                case 'get_stats':
                    this._handleGetStats(session);
                    break;
                    
                case 'ping':
                    this._sendToClient(session, { type: 'pong' });
                    break;
                    
                default:
                    logger.warn(`Unknown message type: ${data.type}`);
            }
            
        } catch (err) {
            logger.error(`Error processing client message (${session.sessionId}):`, err);
            this._sendToClient(session, {
                type: 'error',
                message: 'Invalid message format'
            });
        }
    }
    
    /**
     * Handle audio chunk
     * @private
     */
    _handleAudioChunk(session, data) {
        const success = pythonService.sendData(session.sessionId, data);
        
        if (success) {
            session.incrementChunks();
            logger.debug(`Audio chunk sent (${session.sessionId})`);
        } else {
            this._sendToClient(session, {
                type: 'error',
                message: 'Failed to send audio to Python'
            });
        }
    }
    
    /**
     * Handle get all notes request
     * @private
     */
    _handleGetAllNotes(session) {
        pythonService.sendData(session.sessionId, { type: 'get_all_notes' });
    }
    
    /**
     * Handle reset request
     * @private
     */
    _handleReset(session) {
        pythonService.sendData(session.sessionId, { type: 'reset' });
    }
    
    /**
     * Handle get stats request
     * @private
     */
    _handleGetStats(session) {
        const stats = session.getStats();
        this._sendToClient(session, {
            type: 'stats',
            data: stats
        });
    }
    
    /**
     * Handle client disconnect
     * @private
     */
    _handleDisconnect(session) {
        logger.disconnect(`Client disconnected: ${session.sessionId} (Total: ${this.sessions.size - 1})`);
        
        // Terminate session
        session.terminate();
        pythonService.killProcess(session.sessionId);
        
        // Remove from sessions
        this.sessions.delete(session.sessionId);
    }
    
    /**
     * Send message to client
     * @private
     */
    _sendToClient(session, data) {
        if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.send(JSON.stringify(data));
        }
    }
    
    /**
     * Get active session count
     * @returns {number}
     */
    getActiveSessionCount() {
        return this.sessions.size;
    }
    
    /**
     * Cleanup all sessions
     */
    cleanup() {
        logger.info('Cleaning up all sessions...');
        
        this.sessions.forEach(session => {
            session.terminate();
        });
        
        this.sessions.clear();
        pythonService.killAllProcesses();
    }
}

module.exports = new AudioController();
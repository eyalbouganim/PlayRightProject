const { spawn } = require('child_process');
const config = require('../config/config');
const logger = require('../utils/logger');

class PythonService {
    constructor() {
        this.activeProcesses = new Map();
    }
    
    /**
     * Spawn a new Python process for audio analysis
     * @param {string} sessionId - Unique session identifier
     * @returns {ChildProcess} - The spawned Python process
     */
    spawnProcess(sessionId) {
        logger.python(`Spawning Python process for session ${sessionId}`);
        
        const pythonProcess = spawn(config.python.executable, [
            config.python.scriptPath
        ]);
        
        // Track the process
        this.activeProcesses.set(sessionId, pythonProcess);
        
        // Handle process errors
        pythonProcess.on('error', (error) => {
            logger.error(`Python process error (${sessionId}):`, error);
        });
        
        pythonProcess.on('close', (code) => {
            logger.python(`Python process closed (${sessionId}) with code ${code}`);
            this.activeProcesses.delete(sessionId);
        });
        
        return pythonProcess;
    }
    
    /**
     * Send data to Python process
     * @param {string} sessionId - Session identifier
     * @param {object} data - Data to send
     * @returns {boolean} - Success status
     */
    sendData(sessionId, data) {
        const process = this.activeProcesses.get(sessionId);
        
        if (!process || process.killed) {
            logger.error(`Cannot send data: Python process not found for session ${sessionId}`);
            return false;
        }
        
        try {
            process.stdin.write(JSON.stringify(data) + '\n');
            return true;
        } catch (error) {
            logger.error(`Error sending data to Python (${sessionId}):`, error);
            return false;
        }
    }
    
    /**
     * Kill Python process for a session
     * @param {string} sessionId - Session identifier
     */
    killProcess(sessionId) {
        const process = this.activeProcesses.get(sessionId);
        
        if (process && !process.killed) {
            process.kill();
            this.activeProcesses.delete(sessionId);
            logger.python(`Killed Python process for session ${sessionId}`);
        }
    }
    
    /**
     * Kill all active Python processes
     */
    killAllProcesses() {
        logger.python(`Killing all Python processes (${this.activeProcesses.size} active)`);
        
        this.activeProcesses.forEach((process, sessionId) => {
            if (!process.killed) {
                process.kill();
            }
        });
        
        this.activeProcesses.clear();
    }
    
    /**
     * Get active process count
     * @returns {number}
     */
    getActiveProcessCount() {
        return this.activeProcesses.size;
    }
    
    /**
     * Check if process exists for session
     * @param {string} sessionId
     * @returns {boolean}
     */
    hasProcess(sessionId) {
        return this.activeProcesses.has(sessionId);
    }
}

module.exports = new PythonService();
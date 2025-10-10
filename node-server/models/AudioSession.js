const logger = require('../utils/logger');

class AudioSession {
    constructor(sessionId, ws) {
        this.sessionId = sessionId;
        this.ws = ws;
        this.createdAt = new Date();
        this.lastActivity = new Date();
        this.pythonProcess = null;
        this.pythonReady = false;
        this.detectedNotes = [];
        this.totalChunksProcessed = 0;
        this.isActive = true;
    }
    
    updateActivity() {
        this.lastActivity = new Date();
    }
    
    setPythonProcess(process) {
        this.pythonProcess = process;
    }
    
    setPythonReady(ready) {
        this.pythonReady = ready;
        if (ready) {
            logger.python(`Session ${this.sessionId}: Python ready`);
        }
    }
    
    addNotes(notes) {
        this.detectedNotes.push(...notes);
        this.updateActivity();
    }
    
    incrementChunks() {
        this.totalChunksProcessed++;
        this.updateActivity();
    }
    
    getStats() {
        return {
            sessionId: this.sessionId,
            duration: Date.now() - this.createdAt.getTime(),
            totalNotes: this.detectedNotes.length,
            chunksProcessed: this.totalChunksProcessed,
            pythonReady: this.pythonReady,
            isActive: this.isActive
        };
    }
    
    getAllNotes() {
        return this.detectedNotes;
    }
    
    reset() {
        this.detectedNotes = [];
        this.totalChunksProcessed = 0;
        logger.info(`Session ${this.sessionId}: Reset`);
    }
    
    terminate() {
        this.isActive = false;
        if (this.pythonProcess && !this.pythonProcess.killed) {
            this.pythonProcess.kill();
            logger.python(`Session ${this.sessionId}: Python process terminated`);
        }
    }
}

module.exports = AudioSession;
const config = require('../config/config');

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

const emojis = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
    server: '🚀',
    websocket: '🔌',
    python: '🐍',
    audio: '🎵',
    note: '🎹',
    client: '👤',
    disconnect: '👋'
};

class Logger {
    constructor() {
        this.level = levels[config.logging.level] || levels.info;
        this.enableColors = config.logging.enableColors;
    }
    
    _log(level, emoji, message, ...args) {
        if (levels[level] < this.level) return;
        
        const timestamp = new Date().toISOString();
        const color = this._getColor(level);
        
        if (this.enableColors) {
            console.log(
                `${color}${emoji} [${timestamp}] [${level.toUpperCase()}]${colors.reset}`,
                message,
                ...args
            );
        } else {
            console.log(
                `${emoji} [${timestamp}] [${level.toUpperCase()}]`,
                message,
                ...args
            );
        }
    }
    
    _getColor(level) {
        switch(level) {
            case 'debug': return colors.cyan;
            case 'info': return colors.blue;
            case 'warn': return colors.yellow;
            case 'error': return colors.red;
            default: return colors.reset;
        }
    }
    
    debug(message, ...args) {
        this._log('debug', emojis.debug, message, ...args);
    }
    
    info(message, ...args) {
        this._log('info', emojis.info, message, ...args);
    }
    
    warn(message, ...args) {
        this._log('warn', emojis.warn, message, ...args);
    }
    
    error(message, ...args) {
        this._log('error', emojis.error, message, ...args);
    }
    
    success(message, ...args) {
        this._log('info', emojis.success, message, ...args);
    }
    
    server(message, ...args) {
        this._log('info', emojis.server, message, ...args);
    }
    
    websocket(message, ...args) {
        this._log('info', emojis.websocket, message, ...args);
    }
    
    python(message, ...args) {
        this._log('info', emojis.python, message, ...args);
    }
    
    audio(message, ...args) {
        this._log('info', emojis.audio, message, ...args);
    }
    
    note(message, ...args) {
        this._log('info', emojis.note, message, ...args);
    }
    
    client(message, ...args) {
        this._log('info', emojis.client, message, ...args);
    }
    
    disconnect(message, ...args) {
        this._log('info', emojis.disconnect, message, ...args);
    }
}

module.exports = new Logger();
// src/services/audioStreamService.js
// This class manages real-time communication between React and the Node.js server
class AudioStreamService {
    constructor() {
        this.ws = null; // Web socket
        this.audioContext = null;
        this.processor = null;
        this.source = null;
        this.stream = null;
        this.isRecording = false;
        this.onNotesCallback = null;
        this.onStatusCallback = null;
        this.onErrorCallback = null;
    }

    /**
     * Connect to WebSocket server
     */
    connect(url = 'ws://localhost:3001') {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('✅ Connected to server');
                resolve();
            };

            this.ws.onmessage = (event) => {
                this._handleMessage(event.data);
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                if (this.onErrorCallback) {
                    this.onErrorCallback('Connection error');
                }
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('👋 Disconnected from server');
                if (this.onStatusCallback) {
                    this.onStatusCallback('Disconnected');
                }
            };
        });
    }

    /**
     * Handle incoming messages from server
     */
    _handleMessage(data) {
        try {
            const message = JSON.parse(data);

            switch (message.type) {
                case 'status':
                    console.log('Status:', message.message);
                    if (this.onStatusCallback) {
                        this.onStatusCallback(message.message);
                    }
                    break;

                case 'notes':
                    if (this.onNotesCallback && message.notes.length > 0) {
                        this.onNotesCallback(message.notes);
                    }
                    break;

                case 'error':
                    console.error('Server error:', message.message);
                    if (this.onErrorCallback) {
                        this.onErrorCallback(message.message);
                    }
                    break;

                case 'pong':
                    console.log('Pong received');
                    break;

                default:
                    console.log('Unknown message type:', message.type);
            }
        } catch (err) {
            console.error('Failed to parse message:', err);
        }
    }

    /**
     * Get permission to use the microphone, listen to the audio,
     * and chop it into one-second chunks to be sent to the server
     */
    async startRecording() {
        try {
            console.log('🎤 Requesting microphone access...');
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 22050,
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });

            console.log('✅ Microphone access granted');

            // Create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 22050
            });

            const source = this.audioContext.createMediaStreamSource(stream);
            
            // Create ScriptProcessor (deprecated but widely supported)
            const bufferSize = 4096;
            const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
            
            // Collect audio data
            let audioChunks = [];
            let chunkDuration = 0;
            const targetDuration = 1.0; // 1 second chunks
            
            processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                audioChunks.push(new Float32Array(inputData));
                
                chunkDuration += bufferSize / this.audioContext.sampleRate;
                
                // Send every 1 second
                if (chunkDuration >= targetDuration) {
                    this._sendAudioData(audioChunks, this.audioContext.sampleRate);
                    audioChunks = [];
                    chunkDuration = 0;
                }
            };
            
            // Connect nodes
            source.connect(processor);
            processor.connect(this.audioContext.destination);
            
            this.processor = processor;
            this.source = source;
            this.stream = stream;
            this.isRecording = true;

            console.log('🎤 Recording started with AudioContext');
            return true;

        } catch (err) {
            console.error('❌ Failed to start recording:', err);
            if (this.onErrorCallback) {
                this.onErrorCallback('Microphone access denied');
            }
            return false;
        }
    }

    /**
     * Combines the small audio clips, packages them into a standard WAV file format,
     * encodes that file into a text-safe format (Base64), and sends it over the WebSocket.
     */
    _sendAudioData(audioChunks, sampleRate) {
        try {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                console.warn('⚠️ WebSocket not ready');
                return;
            }
            
            // Concatenate all chunks
            const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const audioData = new Float32Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunks) {
                audioData.set(chunk, offset);
                offset += chunk.length;
            }
            
            console.log('🎵 Sending', audioData.length, 'samples at', sampleRate, 'Hz');
            
            // Convert to WAV
            const wavBlob = this._floatArrayToWav(audioData, sampleRate);
            
            // Convert to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1]; // Remove data:audio/wav;base64,
                
                this.ws.send(JSON.stringify({
                    type: 'audio_chunk',
                    audio: base64
                }));
                
                console.log('✅ Sent WAV chunk:', wavBlob.size, 'bytes');
            };
            reader.readAsDataURL(wavBlob);
            
        } catch (err) {
            console.error('❌ Failed to send audio data:', err);
        }
    }

    /**
     * Convert Float32Array to WAV blob
     */
    _floatArrayToWav(audioData, sampleRate) {
        const numChannels = 1;
        const format = 1; // PCM
        const bitDepth = 16;
        
        // Convert float32 to int16
        const samples = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            const s = Math.max(-1, Math.min(1, audioData[i]));
            samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Create WAV file
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        
        // WAV header
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        
        writeString(0, 'RIFF');
        view.setUint32(4, 36 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
        view.setUint16(32, numChannels * bitDepth / 8, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);
        
        // Write audio data
        const offset = 44;
        for (let i = 0; i < samples.length; i++) {
            view.setInt16(offset + i * 2, samples[i], true);
        }
        
        return new Blob([buffer], { type: 'audio/wav' });
    }

    /**
     * Stop recording
     */
    stopRecording() {
        if (this.isRecording) {
            // Disconnect audio nodes
            if (this.processor) {
                this.processor.disconnect();
                this.processor = null;
            }
            if (this.source) {
                this.source.disconnect();
                this.source = null;
            }
            
            // Stop all tracks
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            // Close audio context
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            
            this.isRecording = false;
            console.log('🛑 Recording stopped');
        }
    }

    /**
     * Request all detected notes
     */
    getAllNotes() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'get_all_notes' }));
        }
    }

    /**
     * Reset session
     */
    reset() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'reset' }));
        }
    }

    /**
     * Disconnect
     */
    disconnect() {
        this.stopRecording();
        
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Set callbacks
     */
    onNotes(callback) {
        this.onNotesCallback = callback;
    }

    onStatus(callback) {
        this.onStatusCallback = callback;
    }

    onError(callback) {
        this.onErrorCallback = callback;
    }
}

export default new AudioStreamService();
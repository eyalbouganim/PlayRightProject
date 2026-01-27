# PlayRight Backend Dockerfile
# Node.js server with Python for MusicXML conversion and streaming analysis

FROM node:20-slim

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create Python virtual environment and install dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python packages for both MusicXML conversion and streaming analysis
RUN pip install --no-cache-dir \
    music21 \
    pretty_midi \
    numpy \
    librosa \
    scipy \
    soundfile

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create directories
RUN mkdir -p uploads/audio uploads/temp brain-server

# Set Python path for the application
ENV PYTHON_PATH=/opt/venv/bin/python3

# Cloud Run uses PORT env variable
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

CMD ["node", "server.js"]

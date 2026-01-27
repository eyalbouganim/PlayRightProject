# Dockerfile.local - CPU ONLY for fast local testing
FROM python:3.11-slim

# Prevent prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies (ffmpeg, wget for model download, etc.)
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install PyTorch (CPU VERSION - Small & Fast)
RUN pip3 install --no-cache-dir torch torchvision torchaudio

COPY requirements.txt .

RUN pip3 install --no-cache-dir -r requirements.txt


# 2. Install other dependencies
RUN pip3 install --no-cache-dir \
    piano_transcription_inference \
    pretty_midi \
    scikit-learn \
    gunicorn

# Copy & Permissions for C++ Binaries
COPY A2SA/cpp/ A2SA/cpp/
RUN chmod +x A2SA/cpp/*

# Copy Code
COPY A2SA/python/ A2SA/python/
COPY cloud_run_wrapper.py .

ENV PORT=8080
EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "300", "--workers", "1", "cloud_run_wrapper:app"]
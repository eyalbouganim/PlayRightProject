"""
Cloud Run HTTP Wrapper for PlayRight Brain Server

This Flask app provides HTTP endpoints for the A2SA (Audio-to-Score Alignment)
functionality, allowing the brain-server to run as a standalone Cloud Run service.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import tempfile
import json

# Add the A2SA python directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'A2SA', 'python'))

from align_eife import run_alignment

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint for Cloud Run."""
    return jsonify({
        "status": "healthy",
        "service": "playright-brain-server",
        "gpu_available": is_gpu_available()
    })

@app.route('/align', methods=['POST'])
def align():
    """
    Audio-to-Score Alignment endpoint.

    Expects multipart/form-data with:
    - audio: WAV audio file of the performance
    - score: MIDI file of the score

    Returns JSON with alignment results.
    """
    try:
        # Validate request
        if 'audio' not in request.files:
            return jsonify({"error": "Missing 'audio' file"}), 400
        if 'score' not in request.files:
            return jsonify({"error": "Missing 'score' file"}), 400

        audio_file = request.files['audio']
        score_file = request.files['score']

        # Create temporary directory for processing
        with tempfile.TemporaryDirectory() as tmpdir:
            audio_path = os.path.join(tmpdir, 'audio.wav')
            score_path = os.path.join(tmpdir, 'score.mid')

            # Save uploaded files
            audio_file.save(audio_path)
            score_file.save(score_path)

            # Run alignment
            result_json = run_alignment(audio_path, score_path)
            result = json.loads(result_json)

            # Check for errors
            if isinstance(result, dict) and 'error' in result:
                return jsonify(result), 500

            return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def is_gpu_available():
    """Check if GPU is available for transcription."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'

    print(f"Starting Brain Server on port {port}")
    print(f"GPU Available: {is_gpu_available()}")

    app.run(host='0.0.0.0', port=port, debug=debug)

from audio_analysis import analyze_music
from flask import Flask, request, jsonify
from flask_cors import CORS  # Important for React communication
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Allows React (different port) to call your API

# Simple endpoint
@app.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "Server is running!"})

# Endpoint that receives data
@app.route('/analyze', methods=['POST'])
def analyze_audio():
    audio_file = request.files.get('audio')

    if not audio_file:
        return jsonify({"error": "No audio file provided"}), 400

    # Get the original file extension
    filename = secure_filename(audio_file.filename)
    extension = os.path.splitext(filename)[1]  # Gets '.mp3' or '.wav'

    # Save with correct extension
    temp_path = f'temp_audio{extension}'
    audio_file.save(temp_path)

    try:
        # Your analysis logic
        result = analyze_music(temp_path)

        return jsonify({
            "score": result['score'],
            "notes_detected": result['notes']
        })
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == '__main__':
    app.run(debug=True, port=3000)

    
from audio_analysis import analyze_music
from flask import Flask, request, jsonify
from flask_cors import CORS  # Important for React communication

app = Flask(__name__)
CORS(app)  # Allows React (different port) to call your API

# Simple endpoint
@app.route('/test', methods=['GET'])
def test():
    return jsonify({"message": "Server is running!"})

# Endpoint that receives data
@app.route('/analyze', methods=['POST'])
def analyze_audio():
    # Get uploaded file
    audio_file = request.files['audio']
    
    # Save temporarily
    audio_file.save('temp_audio.wav')
    
    # Your analysis logic here
    result = analyze_music('temp_audio.wav')
    
    # Return JSON response
    return jsonify({
        "score": result['score'],
        "notes_detected": result['notes']
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
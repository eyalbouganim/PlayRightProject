from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js communication

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'Python Audio Analysis Server is running',
        'version': '1.0.0'
    })

@app.route('/analyze', methods=['POST'])
def analyze_audio():
    # Mock analysis for now
    return jsonify({
        'overallScore': 85,
        'tempoAccuracy': 92,
        'pitchAccuracy': 78,
        'rhythmAccuracy': 88,
        'feedback': [
            'Great tempo control!',
            'Work on pitch accuracy',
            'Good rhythm overall'
        ]
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
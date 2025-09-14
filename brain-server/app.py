from flask import Flask, request, jsonify
from flask_cors import CORS
from audio_analysis import detect_single_note
import os

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'message': 'Python Audio Analysis Server is running',
        'version': '1.0.0'
    })

@app.route('/analyze', methods=['POST'])
def analyze_audio():
    try:
        # Check if audio file was uploaded
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file temporarily
        temp_path = f"temp_{audio_file.filename}"
        audio_file.save(temp_path)
        
        # Analyze the audio
        result = detect_single_note(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        return jsonify({
            'success': True,
            'analysis': result,
            'overallScore': 85,  # Mock score for now
            'feedback': [f'Detected note: {result["note"]}']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
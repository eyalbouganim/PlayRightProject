# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from audio_analysis import detect_single_note
from live_listener import start_listener, stop_listener, state
import os
import threading

app = Flask(__name__)
CORS(app)

_listener_handles = {
    'stream': None,
    'thread': None
}

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
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        temp_path = f"temp_{audio_file.filename}"
        audio_file.save(temp_path)
        result = detect_single_note(temp_path)
        os.remove(temp_path)
        return jsonify({
            'success': True,
            'analysis': result,
            'overallScore': 85,
            'feedback': [f'Detected note: {result["note"]}']
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/live/start', methods=['POST'])
def live_start():
    if _listener_handles['stream'] is not None:
        return jsonify({'status': 'already_running'})
    stream, thread = start_listener()
    _listener_handles['stream'] = stream
    _listener_handles['thread'] = thread
    return jsonify({'status': 'started'})

@app.route('/live/stop', methods=['POST'])
def live_stop():
    if _listener_handles['stream'] is None:
        return jsonify({'status': 'not_running'})
    from live_listener import stop_listener
    stop_listener(_listener_handles['stream'], _listener_handles['thread'])
    _listener_handles['stream'] = None
    _listener_handles['thread'] = None
    return jsonify({'status': 'stopped'})

@app.route('/live/status', methods=['GET'])
def live_status():
    with state.lock:
        return jsonify({
            'currentNote': state.current_note,
            'lastStableNote': state.last_stable_note,
            'frequency': state.frequency,
            'confidence': state.confidence
        })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=True)
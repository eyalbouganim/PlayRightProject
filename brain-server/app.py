import os
import sys
import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename

# --- IMPORT YOUR NEW VERIFIER ---
# We use the No-ML DSP Verifier as requested
try:
    from dsp_verification import DspVerifier
except ImportError as e:
    print("❌ Error: Could not import dsp_verification.py. Make sure it is in the same folder.")
    traceback.print_exc()
    sys.exit(1)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize the Verifier once (Global)
verifier = DspVerifier()

# --- CONFIGURATION ---
# Define where your MusicXML files are stored relative to this script
# Adjust these paths if your folder structure is different
DEFAULT_XML_PATH = os.path.join(os.path.dirname(__file__), 'assets', 'twinkle_twinkle.musicxml')
USER_XML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../node-server/uploads/musicxml'))

@app.route('/test', methods=['GET'])
def test_endpoint():
    return jsonify({"status": "Brain Server is Online", "verifier": "DSP/No-ML"})

@app.route('/analyze', methods=['POST'])
def analyze_performance():
    """
    Main endpoint called by the React Client.
    Expected FormData:
      - audio: The recorded file (wav/mp3/blob)
      - song_id: The ID of the song (to find the MusicXML)
    """
    # 1. Validation
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    song_id = request.form.get('song_id')

    if not audio_file.filename:
        return jsonify({"error": "Empty filename"}), 400

    # 2. Save Audio Temporarily
    filename = secure_filename(audio_file.filename)
    # Ensure we keep the extension (likely .wav or .webm)
    temp_audio_path = os.path.join(os.path.dirname(__file__), f"temp_{filename}")
    
    try:
        audio_file.save(temp_audio_path)
        print(f"--- Received Audio: {filename} | Song ID: {song_id} ---", file=sys.stderr)

        # 3. Resolve MusicXML Path
        xml_path = None
        
        if not song_id or song_id == 'default':
            # Use the built-in default if no ID provided
            xml_path = DEFAULT_XML_PATH
            print(f"--- Using Default XML: {xml_path} ---", file=sys.stderr)
        else:
            # Look for the user/system uploaded file
            potential_path = os.path.join(USER_XML_DIR, f"{song_id}.musicxml")
            if os.path.exists(potential_path):
                xml_path = potential_path
                print(f"--- Found User XML: {xml_path} ---", file=sys.stderr)
            else:
                # Fallback to default if file missing (prevents crash)
                print(f"--- ⚠️ XML not found at {potential_path}, falling back to default ---", file=sys.stderr)
                xml_path = DEFAULT_XML_PATH

        # 4. Run Verification (The "Brain")
        # This calls the verify method from dsp_verification.py
        result = verifier.verify(temp_audio_path, xml_path)
        
        # 5. Return Results
        return jsonify(result)

    except Exception as e:
        print(f"--- SERVER ERROR: {str(e)} ---", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal Processing Error", "details": str(e)}), 500

    finally:
        # 6. Cleanup (Always delete the temp audio)
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
            print("--- Temp file cleaned up ---", file=sys.stderr)

if __name__ == '__main__':
    # Run on port 5000 (standard Flask port) or 3000 as per your previous setup
    print("--- Starting Polyphonic Verification Server (DSP Mode) ---")
    app.run(host='0.0.0.0', port=5000, debug=True)
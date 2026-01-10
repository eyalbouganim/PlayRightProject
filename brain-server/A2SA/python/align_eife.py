import sys
import os
import subprocess
import json
import numpy as np
import pretty_midi
import shutil
import tempfile
from transcription import transcribe_audio_to_midi

def run_alignment(audio_path, score_path):
    # Setup Paths
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    CPP_DIR = os.path.join(BASE_DIR, '../cpp')
    
    tools = {
        "midi2pianoroll": os.path.join(CPP_DIR, 'midi2pianoroll'),
        "SprToFmt3x": os.path.join(CPP_DIR, 'SprToFmt3x'),
        "Fmt3xToHmm": os.path.join(CPP_DIR, 'Fmt3xToHmm'),
        "ScorePerfmMatcher": os.path.join(CPP_DIR, 'ScorePerfmMatcher'),
        "ErrorDetection": os.path.join(CPP_DIR, 'ErrorDetection'),
        "RealignmentMOHMM": os.path.join(CPP_DIR, 'RealignmentMOHMM'),
        "MatchToCorresp": os.path.join(CPP_DIR, 'MatchToCorresp')
    }

    for name, path in tools.items():
        if not os.path.exists(path):
            return json.dumps({"error": f"Missing binary: {name}", "path": path})

    # SANDBOX EXECUTION
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            stem_score = "score"
            stem_perf = "perf"
            file_score = stem_score + ".mid"
            file_perf = stem_perf + ".mid"
            
            shutil.copy2(score_path, os.path.join(temp_dir, file_score))
            transcribe_audio_to_midi(audio_path, os.path.join(temp_dir, file_perf), device='cpu')

            # C++ Pipeline
            subprocess.run([tools["midi2pianoroll"], "0", stem_score], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)
            subprocess.run([tools["midi2pianoroll"], "0", stem_perf], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)

            spr_score = stem_score + "_spr.txt"
            spr_perf = stem_perf + "_spr.txt"

            subprocess.run([tools["SprToFmt3x"], spr_score, "score_fmt3x.txt"], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)
            subprocess.run([tools["Fmt3xToHmm"], "score_fmt3x.txt", "score_hmm.txt"], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)
            # Using 0.001 as transition probability floor
            subprocess.run([tools["ScorePerfmMatcher"], "score_hmm.txt", spr_perf, "match_pre.txt", "0.001"], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)
            subprocess.run([tools["ErrorDetection"], "score_fmt3x.txt", "score_hmm.txt", "match_pre.txt", "match_err.txt", "0"], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)
            # Using 0.3 as realignment window width
            subprocess.run([tools["RealignmentMOHMM"], "score_fmt3x.txt", "score_hmm.txt", "match_err.txt", "match_final.txt", "0.3"], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)
            subprocess.run([tools["MatchToCorresp"], "match_final.txt", spr_score, "corresp.txt"], cwd=temp_dir, check=True, stdout=subprocess.DEVNULL)

            corresp_path = os.path.join(temp_dir, "corresp.txt")
            perf_midi_path = os.path.join(temp_dir, file_perf)
            
            output_data = parse_corresp(corresp_path, score_path, perf_midi_path)
            return json.dumps(output_data)

        except subprocess.CalledProcessError as e:
            return json.dumps({"error": "C++ Tool Failed", "tool": os.path.basename(e.cmd[0]), "code": e.returncode})
        except Exception as e:
            return json.dumps({"error": str(e)})


def parse_corresp(corresp_path, score_path, perf_path):
    matches = []
    
    # 1. Load Data
    pm_score = pretty_midi.PrettyMIDI(score_path)
    pm_perf = pretty_midi.PrettyMIDI(perf_path)

    score_notes = [n for i in pm_score.instruments for n in i.notes]
    score_notes.sort(key=lambda x: x.start)
    
    perf_notes = [n for i in pm_perf.instruments for n in i.notes]
    perf_notes.sort(key=lambda x: x.start)
    
    strict_matches = {} # Key: Score Index -> Value: True/False

    # 2. Read Alignment
    with open(corresp_path, 'r') as f:
        lines = [l for l in f.readlines() if not l.startswith("//")]
        
    for line in lines:
        parts = line.strip().split()
        if len(parts) < 10: continue 
        
        p_id_str, perf_time = parts[0], float(parts[1])
        s_id_str, score_time = parts[5], float(parts[6])
        
        if p_id_str != "*" and s_id_str != "*":
            # Basic Alignment Match
            match_obj = {
                "s_idx": -1,
                "p_idx": -1,
                "score_time": score_time,
                "perf_time": perf_time
            }
            
            try:
                # Parse Indices
                p_idx = int(p_id_str.split('-')[-1])
                s_idx = int(s_id_str.split('-')[-1])
                match_obj["s_idx"] = s_idx
                match_obj["p_idx"] = p_idx

                # Strict Pitch Check
                if perf_notes[p_idx].pitch == score_notes[s_idx].pitch:
                    strict_matches[s_idx] = True
                    # Only add VALID matches to the list used for timing calculation
                    matches.append(match_obj)
                else:
                    strict_matches[s_idx] = False
            except:
                pass

    if not matches: return []

    # 3. Calculate Local Timing Deviations (The "Musician" Way)
    # We create a map for easy lookup: Score_Index -> Predicted Deviation
    deviation_map = {}
    
    # Sort matches by score time to ensure linear processing
    matches.sort(key=lambda x: x["score_time"])
    
    window_size = 2 # Look 2 notes back and 2 notes forward (Total window ~5)

    for i in range(len(matches)):
        current = matches[i]
        
        # Define Local Window
        start_k = max(0, i - window_size)
        end_k = min(len(matches), i + window_size + 1)
        
        window_matches = matches[start_k:end_k]
        
        # If window is too small (e.g. start/end of song), use global or skip
        if len(window_matches) < 3:
            deviation_map[current["s_idx"]] = 0.0 # Give benefit of doubt at start/end
            continue

        # Extract X (Score) and Y (Perf) for the window
        # We EXCLUDE the current note from the fit to see if it stands out
        fit_x = []
        fit_y = []
        for m in window_matches:
            if m["s_idx"] != current["s_idx"]:
                fit_x.append(m["score_time"])
                fit_y.append(m["perf_time"])
        
        if len(fit_x) < 2:
            deviation_map[current["s_idx"]] = 0.0
            continue

        # Calculate Local Slope (Tempo)
        # We basically ask: "Given the surrounding notes, where SHOULD this one be?"
        try:
            # [CRITICAL FIX] Handle Chords (Division by Zero protection)
            # If all notes in the window have the exact same Score Time (a chord),
            # the 'run' (dx) is 0, causing Polyfit to crash or output Infinity.
            x_spread = max(fit_x) - min(fit_x)
            
            if x_spread < 0.001:
                # Vertical line situation (Chord).
                # We assume a slope of 1.0 (neutral tempo) locally to avoid crash.
                slope = 1.0
                intercept = np.mean(fit_y) - (slope * np.mean(fit_x))
            else:
                slope, intercept = np.polyfit(fit_x, fit_y, 1)
                
            predicted_perf_time = (slope * current["score_time"]) + intercept
            deviation = abs(current["perf_time"] - predicted_perf_time)
            deviation_map[current["s_idx"]] = deviation
        except:
            # Fallback for any other linear algebra instability
            deviation_map[current["s_idx"]] = 0.0

    # 4. Interpolation for UI (Visualization only)
    # We still use interpolation to place the red "missing" notes on the timeline
    m_score_t = [m["score_time"] for m in matches]
    m_perf_t = [m["perf_time"] for m in matches]
    
    orig_starts = [n.start for n in score_notes]
    orig_ends = [n.end for n in score_notes]
    
    warped_starts = np.interp(orig_starts, m_score_t, m_perf_t)
    warped_ends = np.interp(orig_ends, m_score_t, m_perf_t)
    
    # 5. Build Final Result
    result = []
    for i, note in enumerate(score_notes):
        # Determine Status
        is_correct = (i in strict_matches and strict_matches[i] is True)
        
        # Get deviation if it exists, else 0
        timing_dev = deviation_map.get(i, 0.0)
        
        # If note is wrong/missed, timing deviation is irrelevant (set to 0)
        if not is_correct:
            timing_dev = 0.0

        result.append({
            "pitch": int(note.pitch),
            "start": float(warped_starts[i]),
            "end": float(warped_ends[i]),
            "velocity": int(note.velocity),
            "original_start": float(note.start),
            "is_played": is_correct,
            "timing_deviation": float(timing_dev)
        })
        
    return result

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python align_eife.py <audio> <score>"}))
    else:
        print(run_alignment(sys.argv[1], sys.argv[2]))
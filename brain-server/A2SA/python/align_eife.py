import sys
import os
import subprocess
import json
import numpy as np
import pretty_midi
import shutil
import tempfile
import torch
from transcription import transcribe_audio_to_midi

# Auto-detect GPU availability for Docker compatibility
DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'

# Redirect libraries to stderr so JSON isn't polluted
original_stdout = sys.stdout
sys.stdout = sys.stderr

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
            
            transcribe_audio_to_midi(audio_path, os.path.join(temp_dir, file_perf), device=DEVICE)

            # Copy learned params config if it exists
            config_file = os.path.join(CPP_DIR, 'learned_params.config')
            if os.path.exists(config_file):
                shutil.copy2(config_file, os.path.join(temp_dir, 'learned_params.config'))

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
                p_idx = int(p_id_str.split('-')[-1])
                s_idx = int(s_id_str.split('-')[-1])
                match_obj["s_idx"] = s_idx
                match_obj["p_idx"] = p_idx

                # STRICT PITCH CHECK
                if perf_notes[p_idx].pitch == score_notes[s_idx].pitch:
                    strict_matches[s_idx] = True
                    matches.append(match_obj)
                else:
                    strict_matches[s_idx] = False
            except:
                pass

    if not matches: return []

    deviation_map = {}
    matches.sort(key=lambda x: x["score_time"])
    window_size = 2 

    for i in range(len(matches)):
        current = matches[i]
        start_k = max(0, i - window_size)
        end_k = min(len(matches), i + window_size + 1)
        window_matches = matches[start_k:end_k]
        
        if len(window_matches) < 3:
            deviation_map[current["s_idx"]] = 0.0
            continue

        fit_x = []
        fit_y = []
        for m in window_matches:
            if m["s_idx"] != current["s_idx"]:
                fit_x.append(m["score_time"])
                fit_y.append(m["perf_time"])
        
        if len(fit_x) < 2:
            deviation_map[current["s_idx"]] = 0.0
            continue

        try:
            x_spread = max(fit_x) - min(fit_x)
            if x_spread < 0.001:
                slope = 1.0
                intercept = np.mean(fit_y) - (slope * np.mean(fit_x))
            else:
                slope, intercept = np.polyfit(fit_x, fit_y, 1)
                
            predicted_perf_time = (slope * current["score_time"]) + intercept
            # No abs needed, we want signed deviation so we can see early/late
            deviation = current["perf_time"] - predicted_perf_time
            deviation_map[current["s_idx"]] = deviation
        except:
            deviation_map[current["s_idx"]] = 0.0

    m_score_t = [m["score_time"] for m in matches]
    m_perf_t = [m["perf_time"] for m in matches]
    
    orig_starts = [n.start for n in score_notes]
    orig_ends = [n.end for n in score_notes]
    
    warped_starts = np.interp(orig_starts, m_score_t, m_perf_t)
    warped_ends = np.interp(orig_ends, m_score_t, m_perf_t)
    
    result = []
    for i, note in enumerate(score_notes):
        is_correct = (i in strict_matches and strict_matches[i] is True)
        timing_dev = deviation_map.get(i, 0.0)
        if not is_correct: timing_dev = 0.0

        # Force minimum duration for collapsed notes
        final_start = float(warped_starts[i])
        final_end = float(warped_ends[i])
        
        if final_end <= final_start:
             final_end = final_start + 0.1 # Force 100ms visibility if collapsed

        result.append({
            "pitch": int(note.pitch),
            "start": final_start,
            "end": final_end,
            "velocity": int(note.velocity),
            "original_start": float(note.start),
            "is_played": is_correct,
            "timing_deviation": float(timing_dev)
        })
        
    return result

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python align_eife.py <audio> <score>"}), file=original_stdout)
    else:
        try:
            result_json_str = run_alignment(sys.argv[1], sys.argv[2])
            sys.stdout = original_stdout
            print(result_json_str)
        except Exception as e:
            sys.stdout = original_stdout
            print(json.dumps({"error": str(e)}))
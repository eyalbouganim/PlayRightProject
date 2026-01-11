import json
import matplotlib.pyplot as plt
import matplotlib.patches as patches
import sys

def visualize_json(json_path):
    # Load Data
    with open(json_path, 'r') as f:
        data = json.load(f)

    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Set plot limits
    min_pitch = min(d['pitch'] for d in data) - 2
    max_pitch = max(d['pitch'] for d in data) + 2
    max_time = max(d['end'] for d in data) + 1
    
    # --- DRAWING ---
    for note in data:
        pitch = note['pitch']
        start = note['start']
        end = note['end']
        duration = end - start
        
        # 1. Draw the "Score" Slot (Where the note SHOULD be)
        # We use the 'warped' times for visualization consistency
        rect_score = patches.Rectangle(
            (start, pitch - 0.4), duration, 0.8, 
            linewidth=1, edgecolor='black', facecolor='lightgray', alpha=0.5, linestyle='--'
        )
        ax.add_patch(rect_score)

        # 2. Draw the "Status"
        if not note['is_played']:
            # MISSED NOTE (Red X or Box)
            rect_miss = patches.Rectangle(
                (start, pitch - 0.4), duration, 0.8, 
                linewidth=1, edgecolor='red', facecolor='salmon', alpha=0.8
            )
            ax.add_patch(rect_miss)
            ax.text(start, pitch, "MISS", color='red', fontsize=8, fontweight='bold', va='center')
            
        else:
            # PLAYED NOTE (Green)
            # We calculate actual performance start based on deviation
            # (Approximation for visualization since we only have deviation in JSON)
            # Green Intensity depends on accuracy? 
            # For now, solid Green.
            rect_hit = patches.Rectangle(
                (start, pitch - 0.4), duration, 0.8, 
                linewidth=1, edgecolor='green', facecolor='limegreen', alpha=0.9
            )
            ax.add_patch(rect_hit)
            
            # Show Deviation Text if significant
            dev = note['timing_deviation']
            if dev > 0.05: # Only show if off by > 50ms
                ax.text(start, pitch + 0.5, f"{int(dev*1000)}ms", color='blue', fontsize=7)

    # Formatting
    ax.set_ylim(min_pitch, max_pitch)
    ax.set_xlim(0, max_time)
    ax.set_xlabel('Time (seconds)')
    ax.set_ylabel('MIDI Pitch')
    ax.set_title('Alignment Analysis: Score vs Performance')
    ax.grid(True, which='both', axis='y', linestyle=':', alpha=0.6)
    
    # Piano Key Labels
    pitch_range = range(min_pitch, max_pitch)
    ax.set_yticks(pitch_range)
    
    plt.tight_layout()
    plt.savefig("alignment.png", dpi=300, bbox_inches="tight")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python visualize_alignment.py <path_to_output.json>")
    else:
        visualize_json(sys.argv[1])
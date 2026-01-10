#!/bin/bash
echo "Compiling Toolset..."

# Define source file mappings
# (Source Filename -> Output Binary Name)
declare -A tools=( 
    ["midi2pianoroll.cpp"]="midi2pianoroll"
    ["SprToFmt3x.cpp"]="SprToFmt3x"
    ["Fmt3xToHmm.cpp"]="Fmt3xToHmm"
    ["ScorePerfmMatcher.cpp"]="ScorePerfmMatcher"
    ["ErrorDetection.cpp"]="ErrorDetection"
    ["RealignmentMOHMM.cpp"]="RealignmentMOHMM"
    ["MatchToCorresp.cpp"]="MatchToCorresp"
)

for src in "${!tools[@]}"; do
    bin="${tools[$src]}"
    if [ -f "$src" ]; then
        echo "Compiling $bin..."
        g++ -O3 -o "$bin" "$src"
    else
        echo "⚠️  Missing source: $src"
    fi
done

echo "✅ Compilation Complete."

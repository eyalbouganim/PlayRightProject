const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');
const logger = require('../utils/logger');

const vertex_ai = new VertexAI({
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION || 'us-central1'
});

const modelName = 'gemini-2.5-flash'; 

const generativeModel = vertex_ai.getGenerativeModel({
    model: modelName
});

/**
 * SMART FILTER: Prepares data based on user score
 */
const filterPerformanceData = (data) => {
    const LOW_SCORE_THRESHOLD = 60;
    
    // 1. GENERAL ADVICE MODE (Score < 60)
    if (data.score < LOW_SCORE_THRESHOLD) {
        let focusArea = "basics";
        const badPitch = data.pitch < 60;
        const badTiming = data.timing < 60;

        if (badPitch && badTiming) focusArea = "both pitch and timing";
        else if (badPitch) focusArea = "pitch accuracy";
        else if (badTiming) focusArea = "timing stability";

        return {
            mode: "general_advice",
            song: data.songTitle || "the song",
            score: data.score,
            primary_focus: focusArea, 
        };
    }

    // 2. SPECIFIC FEEDBACK MODE (Score > 60)
    let mistakes = [];
    if (Array.isArray(data.details)) {
        mistakes = data.details.filter(note => 
            note.status !== 'perfect' && note.status !== 'correct'
        );
    }

    const simplifiedMistakes = mistakes.slice(0, 20).map(m => ({
        note: m.expected_note,
        issue: m.pitch_correct ? "Timing" : "Pitch"
    }));

    return {
        mode: "specific_feedback",
        song: data.songTitle || "the song",
        score: data.score,
        mistakes_sample: simplifiedMistakes.length > 0 ? simplifiedMistakes : "Perfect run"
    };
};

exports.generatePerformanceFeedback = async (performanceData) => {
    try {
        const cleanData = filterPerformanceData(performanceData);
        console.log("--- SENDING DATA ---", JSON.stringify(cleanData));

        // ✅ COMPRESSED PROMPT
        const prompt = `
            Act as a supportive music teacher analyzing this data: ${JSON.stringify(cleanData)}

            Write a 3-sentence summary using this logic:
            1. Mode "general_advice": Acknowledge difficulty. If focus is "pitch"->suggest pitch accuracy exercises; "timing"->metronome; "both"->slow down.
            2. Mode "specific_feedback": Praise score. Mention mistakes if any, when mentioning a mistake mention where was it in the song,
            and if you identify patterns of mistakes, mention them too. If timing or pitch is specifically weak, highlight the weak area.
            2.5. Randomly talk about one of [Correct Fingering, Dedicated Exercises, Consistent Practice, Relaxation Techniques].
            3. "Perfect run": Give high praise.
            4. Give tips according to specific mistakes sent if relevant.
        `;

        const request = {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                maxOutputTokens: 4096, 
                temperature: 0.7,
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        };

        const result = await generativeModel.generateContent(request);
        const candidate = result.response.candidates[0];

        if (candidate && candidate.content && candidate.content.parts[0]) {
            return candidate.content.parts[0].text;
        }
        
        return "Great effort! Keep practicing.";

    } catch (error) {
        logger.error(`AI Error: ${error.message}`);
        return "Great job practicing! Focus on steady rhythm next session.";
    }
};
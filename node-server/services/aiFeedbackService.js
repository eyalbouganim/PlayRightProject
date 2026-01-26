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
            missedNotes: data.missedNotes || 0,
            totalNotes: data.totalNotes || 0,
            earlyNotes: data.earlyNotes || 0,
            lateNotes: data.lateNotes || 0,
            detailedAnalysis: data.detailedAnalysis || ""
        };
    }

    // 2. SPECIFIC FEEDBACK MODE (Score >= 60)
    // Use enhanced note analysis if available
    const hasDetailedAnalysis = data.detailedAnalysis && data.detailedAnalysis.length > 0;

    let issuesSummary = [];

    if (hasDetailedAnalysis) {
        // Use the new detailed analysis from detected_notes
        if (data.missedNotes > 0) {
            issuesSummary.push(`Missed ${data.missedNotes} notes`);
        }
        if (data.earlyNotes > 0) {
            issuesSummary.push(`${data.earlyNotes} notes played too early`);
        }
        if (data.lateNotes > 0) {
            issuesSummary.push(`${data.lateNotes} notes played too late`);
        }
        if (data.badTimingNotes > 0) {
            issuesSummary.push(`${data.badTimingNotes} notes had significant timing issues`);
        }
        if (data.perfectNotes > 0) {
            issuesSummary.push(`${data.perfectNotes} notes played perfectly`);
        }
    } else {
        // Fallback to old system if detailed analysis not available
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

        if (simplifiedMistakes.length > 0) {
            issuesSummary.push(`Found ${simplifiedMistakes.length} issues`);
        }
    }

    return {
        mode: "specific_feedback",
        song: data.songTitle || "the song",
        score: data.score,
        pitchAccuracy: data.pitch,
        timingAccuracy: data.timing,
        totalNotes: data.totalNotes || 0,
        issues: issuesSummary.length > 0 ? issuesSummary : ["Perfect performance"],
        detailedAnalysis: data.detailedAnalysis || "No specific issues detected"
    };
};

exports.generatePerformanceFeedback = async (performanceData) => {
    try {
        const cleanData = filterPerformanceData(performanceData);
        console.log("--- SENDING DATA ---", JSON.stringify(cleanData));

        // ✅ ENHANCED PROMPT with specific note analysis
        let prompt = '';

        if (cleanData.mode === "general_advice") {
            prompt = `
                Act as a supportive music teacher analyzing this performance data: ${JSON.stringify(cleanData)}

                The student scored ${cleanData.score}% on "${cleanData.song}".
                ${cleanData.detailedAnalysis ? `Specific issues: ${cleanData.detailedAnalysis}` : ''}

                Write a 3-4 sentence encouraging feedback:
                1. Acknowledge the effort and that learning music takes time
                2. Focus on "${cleanData.primary_focus}" as the main area to improve
                3. If missedNotes > 0, suggest slowing down the tempo or practicing in sections
                4. If earlyNotes or lateNotes are mentioned, recommend using a metronome
                5. End with one practical tip from: [Correct Fingering, Section Practice, Slow Practice, Metronome Use]
            `;
        } else {
            // specific_feedback mode
            const isPerfect = cleanData.score >= 95 && cleanData.issues[0] === "Perfect performance";

            if (isPerfect) {
                prompt = `
                    Act as an enthusiastic music teacher. The student scored ${cleanData.score}% on "${cleanData.song}" - nearly perfect!

                    Write 2-3 sentences:
                    1. Give high praise and celebrate their achievement
                    2. Encourage them to try a more challenging piece or increase tempo
                    3. Mention their consistency and accuracy
                `;
            } else {
                prompt = `
                    Act as a constructive music teacher analyzing this performance: ${JSON.stringify(cleanData)}

                    The student scored ${cleanData.score}% on "${cleanData.song}".
                    Pitch Accuracy: ${cleanData.pitchAccuracy}%, Timing Accuracy: ${cleanData.timingAccuracy}%

                    Specific analysis: ${cleanData.detailedAnalysis}
                    Issues found: ${cleanData.issues.join('; ')}

                    Write a 3-4 sentence feedback:
                    1. Start with praise for the score (good/excellent depending on level)
                    2. Identify the most significant issue:
                       - If "notes played too early" -> suggest they're rushing, recommend metronome practice
                       - If "notes played too late" -> suggest they're hesitating, practice transitions between notes
                       - If "Missed X notes" -> recommend slower practice to build muscle memory
                       - If timing is weak (< 70%) -> emphasize steady rhythm practice
                       - If pitch is weak (< 70%) -> focus on note accuracy before speed
                    3. If you notice both early AND late notes, mention inconsistent tempo as the root cause
                    4. End with one actionable tip that addresses their main weakness

                    Be specific and constructive, not generic.
                `;
            }
        }

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
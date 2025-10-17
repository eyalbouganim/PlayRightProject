import scoreService from '../services/scoreService.js';

// Post /score route - this function will be called when a POST request is made to /score
const calculateScore = async (req, res) => {
    try {
        // 1. Get the data from the request body
        const { correctNotes, playedNotes } = req.body;

        // 2. Validation of the data
        if (!correctNotes || !playedNotes) {
            return res.status(400).json({ error: 'Missing correctNotes or playedNotes in request body' });
        }

        // 3. Calling the service function to calculate the score
        const result = scoreService.calculate(correctNotes, playedNotes);

        // 4. Sending back the response
        return res.status(200).json({ score: result });
    } catch (error) {
        console.error('Error calculating score:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
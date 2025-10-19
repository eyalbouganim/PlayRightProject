// src/services/performancesService.js

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../config/config');

const PYTHON_EXECUTABLE = config.python.executable;
const ANALYSIS_SCRIPT_PATH = config.python.analysisScriptPath;

/**
 * Converts an audio file to WAV format using FFmpeg.
 * @param {string} inputFilePath Path to the input audio file (e.g., .webm).
 * @returns {Promise<string>} A promise that resolves with the path to the converted WAV file.
 * @throws {Error} If FFmpeg conversion fails.
 */
const convertToWav = (inputFilePath) => {
    return new Promise((resolve, reject) => {
        const outputFilePath = inputFilePath.replace(path.extname(inputFilePath), '.wav');
        const ffmpegCommand = `ffmpeg -i "${inputFilePath}" -y "${outputFilePath}"`;

        logger.info(`Converting to WAV: ${ffmpegCommand}`);

        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                logger.error(`FFmpeg conversion error: ${error.message}`);
                if (stderr) logger.error(`FFmpeg stderr: ${stderr}`);
                reject(new Error(`FFmpeg failed: ${error.message}`));
                return;
            }
            if (stderr) {
                logger.warn(`FFmpeg stderr (warnings): ${stderr}`);
            }
            logger.success(`Successfully converted to WAV: ${outputFilePath}`);
            resolve(outputFilePath);
        });
    });
};

/**
 * Analyzes a given audio file performance against a song ID by running a Python script.
 * @param {string} audioFilePath - The absolute path to the temporary uploaded audio file (e.g., .webm).
 * @param {string} songId - The ID of the song being performed.
 * @returns {Promise<object>} A promise that resolves with the analysis result (parsed JSON).
 */
const analyzePerformance = async (audioFilePath, songId) => { // Renamed this function
    let wavFilePath = null; // Track WAV path for cleanup

    try {
        // --- Step 1: Convert to WAV ---
        wavFilePath = await convertToWav(audioFilePath);

        // --- Step 2: Run Python Analysis ---
        logger.info(`Starting Python analysis for WAV: ${wavFilePath}, Song: ${songId}`);

        if (!PYTHON_EXECUTABLE || !ANALYSIS_SCRIPT_PATH) {
            throw new Error("Python executable or analysis script path not defined in config.");
        }

        const scriptArgs = [
            ANALYSIS_SCRIPT_PATH,
            '--audio-path', wavFilePath,
            '--song-id', songId
        ];

        const pythonResult = await new Promise((resolve, reject) => {
            const pythonProcess = spawn(PYTHON_EXECUTABLE, scriptArgs);
            let stdoutData = '';
            let stderrData = '';

            pythonProcess.stdout.on('data', (data) => { stdoutData += data.toString(); });
            pythonProcess.stderr.on('data', (data) => { stderrData += data.toString(); });

            pythonProcess.on('close', (code) => {
                logger.info(`Python script finished with exit code ${code}`);
                if (stderrData) { logger.error(`Python script stderr: ${stderrData}`); }

                if (code === 0 && stdoutData) {
                    try {
                        const result = JSON.parse(stdoutData);
                        logger.success('Successfully parsed analysis result from Python script.');
                        resolve(result);
                    } catch (parseError) {
                        logger.error(`Failed to parse JSON output from Python: ${stdoutData}`);
                        reject(new Error(`Failed to parse analysis result: ${parseError.message}`));
                    }
                } else {
                    const errorMessage = `Python script execution failed (code ${code || 'unknown'})` + (stderrData ? `: ${stderrData}` : '');
                    logger.error(errorMessage);
                    reject(new Error(errorMessage));
                }
            });

            pythonProcess.on('error', (spawnError) => {
                logger.error('Failed to start Python process:', spawnError);
                reject(new Error(`Failed to start analysis script: ${spawnError.message}`));
            });
        });

        return pythonResult;

    } catch (error) {
        logger.error(`Error during performance analysis pipeline: ${error.message}`);
        throw error; // Rethrow to be caught by the controller

    } finally {
        // --- Step 3: Cleanup ---
        logger.info(`Attempting cleanup after analysis.`);
        if (audioFilePath) {
            fs.unlink(audioFilePath, (err) => {
                if (err) logger.error(`Error deleting original file ${audioFilePath}:`, err);
                else logger.success(`Deleted original file: ${audioFilePath}`);
            });
        }
        if (wavFilePath) {
            fs.unlink(wavFilePath, (err) => {
                if (err) logger.error(`Error deleting converted file ${wavFilePath}:`, err);
                else logger.success(`Deleted converted file: ${wavFilePath}`);
            });
        }
    }
};

module.exports = {
    analyzePerformance // Export using the new name
};
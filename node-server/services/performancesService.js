// src/services/performancesService.js

const { spawn } = require('child_process');
const path = require('path');
const logger = require('../utils/logger');
const config = require('../config/config');

const PYTHON_EXECUTABLE = config.python.executable;
const ANALYSIS_SCRIPT_PATH = config.python.analysisScriptPath; 

const analyze = (audioFilePath, songId) => {
    return new Promise((resolve, reject) => {
        logger.info(`Starting Python analysis for: ${audioFilePath}, Song: ${songId}`);
        // Log the paths being used from config
        logger.info(`Using Python executable: ${PYTHON_EXECUTABLE}`);
        logger.info(`Using script: ${ANALYSIS_SCRIPT_PATH}`);

        // Check if paths are defined
        if (!PYTHON_EXECUTABLE || !ANALYSIS_SCRIPT_PATH) {
            const errorMsg = "Python executable or analysis script path not defined in config.";
            logger.error(errorMsg);
            return reject(new Error(errorMsg));
        }

        const scriptArgs = [
            ANALYSIS_SCRIPT_PATH,
            '--audio-path', audioFilePath,
            '--song-id', songId
        ];

        const pythonProcess = spawn(PYTHON_EXECUTABLE, scriptArgs);

        let stdoutData = '';
        let stderrData = '';

        pythonProcess.stdout.on('data', (data) => {
            stdoutData += data.toString();
        });
        pythonProcess.stderr.on('data', (data) => {
            stderrData += data.toString();
        });
        pythonProcess.on('close', (code) => {
            logger.info(`Python script finished with exit code ${code}`);
            if (stderrData) {
                logger.error(`Python script stderr: ${stderrData}`);
            }
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
};

module.exports = {
    analyze 
};
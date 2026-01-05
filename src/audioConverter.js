const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

/**
 * Convert PCM/Ogg audio file to MP3 format (optimized for speech)
 * @param {string} inputPath - Path to input PCM/Ogg file
 * @returns {Promise<string>} Path to the converted MP3 file
 */
function convertToMp3(inputPath) {
    return new Promise((resolve, reject) => {
        const outputPath = inputPath.replace(/\.(pcm|ogg)$/, '.mp3');
        const ext = path.extname(inputPath);

        let args = [
            '-y',
        ];

        // Input reconfiguration for raw PCM
        if (ext === '.pcm') {
            args.push(
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2',
            );
        }

        args.push(
            '-i', inputPath,
            '-ac', '1',       // Output Mono (reduces size)
            '-ab', '64k',     // 64kbps Bitrate (optimized for speech)
            '-f', 'mp3',
            outputPath
        );

        const ffmpeg = spawn('ffmpeg', args);

        // ffmpeg logs to stderr
        ffmpeg.stderr.on('data', (data) => {
            // logger.debug(`ffmpeg: ${data}`); 
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                logger.info(`Converted: ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
                resolve(outputPath);
            } else {
                reject(new Error(`ffmpeg exited with code ${code}`));
            }
        });
    });
}

/**
 * Merge multiple audio files into a single MP3, preserving timing
 * @param {Array<{path: string, startOffset: number}>} files 
 * @param {string} outputPath 
 */
function mergeAudioFiles(files, outputPath) {
    return new Promise((resolve, reject) => {
        if (!files || files.length === 0) return resolve(null);

        // If single file, just convert to MP3 at target location
        if (files.length === 1) {
            // First convert to temp mp3
            return convertToMp3(files[0].path)
                .then(tempMp3 => {
                    // Rename to target output
                    fs.renameSync(tempMp3, outputPath);
                    resolve(outputPath);
                })
                .catch(reject);
        }

        const args = ['-y'];
        const filters = [];
        const mixInputs = [];

        // Add inputs
        files.forEach((file, index) => {
            // Input args for PCM
            if (file.path.endsWith('.pcm')) {
                args.push('-f', 's16le', '-ar', '48000', '-ac', '2');
            }
            args.push('-i', file.path);

            // Calculate delay
            const delay = Math.max(0, Math.floor(file.startOffset || 0));
            const inputLabel = `[${index}:a]`;
            const delayedLabel = `[d${index}]`;

            // Add delay filter if needed
            if (delay > 0) {
                filters.push(`${inputLabel}adelay=${delay}|${delay}${delayedLabel}`);
                mixInputs.push(delayedLabel);
            } else {
                mixInputs.push(inputLabel);
            }
        });

        // Mix filter
        // normalize=0 prevents volume drop
        const mixFilter = `${mixInputs.join('')}amix=inputs=${files.length}:dropout_transition=0:normalize=0[out]`;
        filters.push(mixFilter);

        args.push(
            '-filter_complex', filters.join(';'),
            '-map', '[out]',
            '-ac', '1',
            '-ab', '64k',
            '-f', 'mp3',
            outputPath
        );

        const ffmpeg = spawn('ffmpeg', args);

        ffmpeg.stderr.on('data', (d) => { /* logger.debug(d.toString()) */ });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                logger.info(`Merged ${files.length} audio files to ${path.basename(outputPath)}`);
                resolve(outputPath);
            } else {
                reject(new Error(`ffmpeg merge exited with code ${code}`));
            }
        });
    });
}

/**
 * Check if FFmpeg is installed
 */
function checkFfmpeg() {
    return new Promise((resolve) => {
        const ffmpeg = spawn('ffmpeg', ['-version']);
        ffmpeg.on('close', (code) => resolve(code === 0));
        ffmpeg.on('error', () => resolve(false));
    });
}

module.exports = {
    convertToMp3,
    mergeAudioFiles,
    checkFfmpeg,
};

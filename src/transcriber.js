const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { convertToMp3 } = require('./audioConverter');
const logger = require('./utils/logger');

/**
 * Transcribe audio using WhisperX with pyannote speaker diarization
 * WhisperX provides word-level timestamps and speaker labels
 */
async function transcribeWithWhisperX(wavPath) {
    const model = process.env.WHISPER_MODEL || 'large-v2';
    const computeType = process.env.COMPUTE_TYPE || 'float16';
    const hfToken = process.env.HF_TOKEN;
    const outputDir = path.dirname(wavPath);
    const baseName = path.basename(wavPath, '.wav');

    if (!hfToken) {
        throw new Error('HF_TOKEN is required for WhisperX with pyannote diarization');
    }

    return new Promise((resolve, reject) => {
        // Build whisperx command with speaker diarization
        const args = [
            wavPath,
            '--model', model,
            '--compute_type', computeType,
            '--output_format', 'json',
            '--output_dir', outputDir,
            // '--diarize', // Disabled (unnecessary per-file processing and causes errors)
            '--hf_token', hfToken,
            '--no_align', // Disable alignment to avoid PyTorch 2.6 crash
        ];

        logger.info(`Running WhisperX with model: ${model}, compute: ${computeType}`);

        const whisperx = spawn('whisperx', args);

        let stdout = '';
        let stderr = '';

        whisperx.stdout.on('data', (data) => {
            stdout += data.toString();
            const lines = data.toString().trim().split('\n');
            for (const line of lines) {
                if (line.trim()) {
                    logger.info(`WhisperX: ${line.trim()}`);
                }
            }
        });

        whisperx.stderr.on('data', (data) => {
            stderr += data.toString();
            // WhisperX logs progress to stderr
            const lines = data.toString().trim().split('\n');
            for (const line of lines) {
                if (line.includes('%') || line.includes('Diarizing') || line.includes('Aligning')) {
                    logger.info(`WhisperX: ${line.trim()}`);
                }
            }
        });

        whisperx.on('close', (code) => {
            if (code === 0) {
                const jsonPath = path.join(outputDir, `${baseName}.json`);
                if (fs.existsSync(jsonPath)) {
                    try {
                        const result = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                        logger.success(`WhisperX transcription complete: ${result.segments?.length || 0} segments`);
                        resolve(result);
                    } catch (error) {
                        reject(new Error(`Failed to parse WhisperX output: ${error.message}`));
                    }
                } else {
                    reject(new Error('WhisperX output file not found'));
                }
            } else {
                logger.error(`WhisperX stderr: ${stderr}`);
                reject(new Error(`WhisperX exited with code ${code}`));
            }
        });

        whisperx.on('error', (error) => {
            if (error.code === 'ENOENT') {
                reject(new Error('WhisperX is not installed. Install with: pip install whisperx'));
            } else {
                reject(error);
            }
        });
    });
}

/**
 * Transcribe audio using Deepgram API (cloud mode)
 */
async function transcribeWithDeepgram(wavPath) {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
        throw new Error('DEEPGRAM_API_KEY is required for cloud STT mode');
    }

    const audioData = fs.readFileSync(wavPath);

    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&detect_language=true', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'audio/mpeg',
        },
        body: audioData,
    });

    if (!response.ok) {
        throw new Error(`Deepgram API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    // Convert Deepgram format to WhisperX-like format
    const segments = [];
    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    let currentSegment = { start: 0, end: 0, text: '', speaker: null };
    for (const word of words) {
        // Start new segment on speaker change
        if (currentSegment.speaker !== null && word.speaker !== currentSegment.speaker) {
            if (currentSegment.text.trim()) {
                segments.push({
                    start: currentSegment.start,
                    end: currentSegment.end,
                    text: currentSegment.text.trim(),
                    speaker: `SPEAKER_${String(currentSegment.speaker).padStart(2, '0')}`,
                });
            }
            currentSegment = { start: word.start, end: 0, text: '', speaker: word.speaker };
        }

        if (currentSegment.text === '') {
            currentSegment.start = word.start;
            currentSegment.speaker = word.speaker;
        }
        currentSegment.text += word.punctuated_word + ' ';
        currentSegment.end = word.end;

        // End segment on sentence-ending punctuation
        if (word.punctuated_word.match(/[.!?]$/)) {
            segments.push({
                start: currentSegment.start,
                end: currentSegment.end,
                text: currentSegment.text.trim(),
                speaker: `SPEAKER_${String(currentSegment.speaker || 0).padStart(2, '0')}`,
            });
            currentSegment = { start: 0, end: 0, text: '', speaker: word.speaker };
        }
    }

    // Push remaining text
    if (currentSegment.text.trim()) {
        segments.push({
            start: currentSegment.start,
            end: currentSegment.end,
            text: currentSegment.text.trim(),
            speaker: `SPEAKER_${String(currentSegment.speaker || 0).padStart(2, '0')}`,
        });
    }

    return { segments };
}

/**
 * Transcribe a single audio file
 */
async function transcribeAudio(audioFile) {
    const { path: audioPath, userId, startOffset } = audioFile;

    logger.info(`Transcribing audio for user ${userId}...`);

    // Convert Audio to MP3
    const mp3Path = await convertToMp3(audioPath);

    // Transcribe based on mode
    const mode = process.env.STT_MODE || 'local';
    let result;

    if (mode === 'cloud') {
        result = await transcribeWithDeepgram(mp3Path);
    } else {
        result = await transcribeWithWhisperX(mp3Path);
    }

    // Adjust timestamps to session timeline and add speaker info
    const segments = (result.segments || []).map(segment => ({
        start: segment.start + (startOffset / 1000),
        end: segment.end + (startOffset / 1000),
        text: segment.text,
        speaker: audioFile.displayName || segment.speaker || `USER_${userId}`,
        userId,
    }));

    return {
        userId,
        segments,
        wavPath: mp3Path,
    };
}

/**
 * Transcribe all recorded files from a session
 */
async function transcribeSession(recordedFiles, sessionDir) {
    const transcriptions = [];

    for (const file of recordedFiles) {
        try {
            const result = await transcribeAudio(file);
            transcriptions.push(result);
        } catch (error) {
            logger.error(`Failed to transcribe ${file.path}:`, error.message);
        }
    }

    return transcriptions;
}

/**
 * Check if WhisperX is available
 */
function checkWhisperX() {
    return new Promise((resolve) => {
        const whisperx = spawn('whisperx', ['--help']);
        whisperx.on('close', (code) => resolve(code === 0));
        whisperx.on('error', () => resolve(false));
    });
}

module.exports = {
    transcribeAudio,
    transcribeSession,
    transcribeWithWhisperX,
    transcribeWithDeepgram,
    checkWhisperX,
};

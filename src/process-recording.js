// Process existing PCM files to generate transcript
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const AudioConverter = require('./audioConverter');
const Transcriber = require('./transcriber');
const { mergeTimeline } = require('./timelineMerger');
const logger = require('./utils/logger');

const SESSION_DIR = process.argv[2];

if (!SESSION_DIR) {
    console.error('Usage: node process-recording.js <session_dir_path>');
    process.exit(1);
}

const run = async () => {
    logger.info(`Processing session: ${SESSION_DIR}`);
    const files = fs.readdirSync(SESSION_DIR).filter(f => f.endsWith('.pcm'));

    if (files.length === 0) {
        logger.error('No PCM files found');
        return;
    }

    const recordedFiles = files.map(f => {
        const userId = f.split('_')[0];
        return {
            userId,
            pcmPath: path.join(SESSION_DIR, f),
            startTime: DateTime.fromMillis(parseInt(f.split('_')[1].split('.')[0]))
        };
    });

    const transcriptions = [];

    for (const record of recordedFiles) {
        logger.info(`Converting ${record.userId}...`);
        const wavPath = await AudioConverter.convertToWav(record.pcmPath);

        logger.info(`Transcribing ${record.userId}...`);

        try {
            // Direct call to exported function
            const result = await Transcriber.transcribeWithWhisperX(wavPath);

            const segments = (result.segments || []).map(s => ({
                ...s,
                speaker: record.userId
            }));

            transcriptions.push({
                userId: record.userId,
                segments
            });
        } catch (e) {
            logger.error(`Transcription failed for ${record.userId}:`, e);
        }
    }

    if (transcriptions.length === 0) {
        logger.error('No transcriptions generated.');
        return;
    }

    logger.info('Merging timeline...');
    const sessionId = path.basename(SESSION_DIR);
    const outputPath = path.join(__dirname, '..', 'transcripts', `${sessionId}.txt`);

    const sessionStartTime = DateTime.fromFormat(sessionId.split('_')[1], 'HHmmss');

    await mergeTimeline(transcriptions, outputPath, sessionStartTime);
    logger.success(`Transcript created: ${outputPath}`);
};

run().catch(console.error);

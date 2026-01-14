const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const OpusScript = require('opusscript');
const logger = require('./utils/logger');

const TIMEZONE = 'Europe/Istanbul';

class AudioRecorder {
    constructor(connection, sessionDir, sessionStartTime, channel) {
        this.connection = connection;
        this.sessionDir = sessionDir;
        this.sessionStartTime = sessionStartTime;
        this.channel = channel; // Voice channel reference for resolving usernames
        this.receiver = null;
        this.streams = new Map(); // userId -> { stream, writeStream, startOffset, displayName }
        this.recordedFiles = [];
        this.isRecording = false;
    }

    /**
     * Start recording audio from all users in the voice channel
     */
    start() {
        this.isRecording = true;
        this.receiver = this.connection.receiver;

        // Listen for speaking events
        this.receiver.speaking.on('start', (userId) => {
            if (!this.isRecording) return;

            // Skip if we're already recording this user
            if (this.streams.has(userId)) return;

            this.startUserRecording(userId);
        });

        logger.info('Audio receiver started, listening for speech...');
    }

    /**
     * Start recording a specific user
     */
    startUserRecording(userId) {
        try {
            // Resolve display name NOW while we have channel access
            // This is critical for multi-worker scenarios where cache isn't shared
            let displayName = `USER_${userId}`;
            try {
                const member = this.channel?.guild?.members?.cache?.get(userId);
                if (member) {
                    displayName = member.displayName || member.user?.username || displayName;
                    logger.info(`Resolved username for ${userId}: ${displayName}`);
                }
            } catch (e) {
                logger.warn(`Could not resolve username for ${userId} at recording start`);
            }

            // Get the audio stream for this user (Opus packets)
            const audioStream = this.receiver.subscribe(userId, {
                end: {
                    behavior: 'manual',
                },
            });

            // Decode using pure JS OpusScript
            const decoder = new OpusScript(48000, 2, OpusScript.Application.AUDIO);

            // Calculate time offset from session start
            const startOffset = DateTime.now().setZone(TIMEZONE).diff(this.sessionStartTime).as('milliseconds');

            // Create output file path
            const filename = `${userId}_${Date.now()}.pcm`;
            const filePath = path.join(this.sessionDir, filename);
            const writeStream = fs.createWriteStream(filePath);

            // Manual decoding loop
            audioStream.on('data', (chunk) => {
                try {
                    const pcm = decoder.decode(chunk);
                    if (pcm) writeStream.write(pcm);
                } catch (e) {
                    // Ignore empty/invalid packets
                }
            });

            // Store stream info with displayName
            this.streams.set(userId, {
                audioStream,
                decoder,
                writeStream,
                filePath,
                startOffset,
                startTime: Date.now(),
                displayName, // Store resolved username at recording start
            });

            logger.info(`Recording user: ${displayName} (${userId})`);

            // Handle stream end
            audioStream.on('end', () => {
                this.finalizeUserRecording(userId);
            });

            audioStream.on('error', (error) => {
                logger.error(`Audio stream error for ${userId}:`, error);
                this.finalizeUserRecording(userId);
            });

        } catch (error) {
            logger.error(`Failed to start recording for ${userId}:`, error);
        }
    }

    /**
     * Finalize recording for a specific user
     */
    finalizeUserRecording(userId) {
        const streamInfo = this.streams.get(userId);
        if (!streamInfo) return;

        try {
            if (streamInfo.decoder && streamInfo.decoder.delete) {
                try { streamInfo.decoder.delete(); } catch (e) { }
            }
            streamInfo.writeStream.end();

            // Check if file has content
            if (fs.existsSync(streamInfo.filePath)) {
                const stats = fs.statSync(streamInfo.filePath);
                if (stats.size > 0) {
                    this.recordedFiles.push({
                        userId,
                        path: streamInfo.filePath,
                        startOffset: streamInfo.startOffset || 0,
                        duration: (Date.now() - streamInfo.startTime) / 1000,
                        displayName: streamInfo.displayName || `USER_${userId}`, // Include resolved username
                    });

                    logger.info(`Saved audio for user ${streamInfo.displayName || userId}: ${path.basename(streamInfo.filePath)}`);
                } else {
                    // Remove empty file
                    fs.unlinkSync(streamInfo.filePath);
                }
            }
        } catch (error) {
            logger.error(`Error finalizing recording for ${userId}:`, error);
        }

        this.streams.delete(userId);
    }

    /**
     * Stop recording all users
     */
    stop() {
        this.isRecording = false;
        logger.info('Stopping audio recorder...');

        // Finalize all active streams
        for (const [userId] of this.streams) {
            this.finalizeUserRecording(userId);
        }

        logger.success(`Recording stopped. ${this.recordedFiles.length} audio file(s) saved.`);
        return this.recordedFiles;
    }
}

module.exports = AudioRecorder;

const path = require('path');
const fs = require('fs');
const { DateTime } = require('luxon');
const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection,
} = require('@discordjs/voice');
const AudioRecorder = require('./audioRecorder');
const { transcribeSession } = require('./transcriber');
const { mergeTimeline } = require('./timelineMerger');
const logger = require('./utils/logger');
const { ensureDir, removeFiles } = require('./utils/cleanup');
const { mergeAudioFiles } = require('./audioConverter');

const TIMEZONE = 'Europe/Istanbul';
const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');
const TRANSCRIPTS_DIR = path.join(process.cwd(), 'transcripts');

class RecordingSession {
    constructor(channel, client) {
        this.channel = channel;
        this.channelId = channel.id;
        this.guildId = channel.guild.id;
        this.client = client;
        this.connection = null;
        this.audioRecorder = null;
        this.startTime = null;
        this.sessionId = null;
        this.sessionDir = null;
    }

    /**
     * Start the recording session
     */
    async start() {
        // Generate session ID
        this.startTime = DateTime.now().setZone(TIMEZONE);
        this.sessionId = this.startTime.toFormat('yyyy-MM-dd_HHmmss');
        this.sessionDir = path.join(RECORDINGS_DIR, this.sessionId);

        // Ensure directories exist
        ensureDir(RECORDINGS_DIR);
        ensureDir(TRANSCRIPTS_DIR);
        ensureDir(this.sessionDir);

        logger.info(`Starting recording session: ${this.sessionId}`);

        // Join the voice channel with retry
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Connecting to voice channel (attempt ${attempt}/${maxRetries})...`);

                this.connection = joinVoiceChannel({
                    channelId: this.channelId,
                    guildId: this.guildId,
                    adapterCreator: this.channel.guild.voiceAdapterCreator,
                    selfDeaf: false,
                    selfMute: true,
                    group: this.client.user.id, // Isolate connection per bot client
                });

                // Wait for connection to be ready (15s timeout instead of 60s)
                // This prevents hanging for too long if UDP packets are dropped
                await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
                logger.success(`Joined voice channel: ${this.channel.name}`);
                lastError = null;
                break;
            } catch (error) {
                lastError = error;
                logger.warn(`Voice connection attempt ${attempt} failed: ${error.message}`);

                // Force cleanup before retry
                if (this.connection) {
                    try {
                        this.connection.destroy();
                    } catch (e) { /* ignore */ }
                    this.connection = null;
                }

                if (attempt < maxRetries) {
                    // Add random jitter to prevent thundering herd
                    const delay = 1000 + Math.random() * 2000;
                    logger.info(`Retrying in ${(delay / 1000).toFixed(1)} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (lastError) {
            logger.error('Failed to join voice channel after all retries:', lastError);
            throw lastError;
        }

        // Start audio recording
        this.audioRecorder = new AudioRecorder(this.connection, this.sessionDir, this.startTime);
        this.audioRecorder.start();

        // Send message to voice text channel
        await this.sendMessage(`⏺ Recording started — ${this.startTime.toFormat('yyyy-MM-dd HH:mm:ss')} (Europe/Istanbul)`);

        logger.info('Recording started');
    }

    /**
     * Stop the recording session
     */
    async stop() {
        if (!this.connection) return;

        logger.info('Stopping recording session...');

        // Stop audio recording
        const recordedFiles = this.audioRecorder ? this.audioRecorder.stop() : [];

        // Disconnect from voice
        this.connection.destroy();
        this.connection = null;

        logger.success('Left voice channel');

        // Generate transcript in background
        if (recordedFiles.length > 0) {
            this.generateTranscript(recordedFiles).catch(err => {
                logger.error('Background transcription failed:', err);
            });
        } else {
            logger.warn('No audio recorded, skipping transcription');
            this.sendMessage('⚠️ Recording stopped — No audio was captured').catch(console.error);
        }
    }

    /**
     * Generate transcript from recorded files
     */
    async generateTranscript(recordedFiles) {
        try {
            logger.info('Processing recording...');
            await this.sendMessage('🔄 Processing audio & transcribing...');

            // 1. Merge & Upload Audio
            try {
                const mergedPath = path.join(this.sessionDir, 'recording_merged.mp3');
                await mergeAudioFiles(recordedFiles, mergedPath);

                if (fs.existsSync(mergedPath)) {
                    logger.info(`Merged audio saved locally: ${mergedPath}`);
                }
            } catch (err) {
                logger.error('Audio merge failed:', err);
            }

            // 2. Transcribe
            logger.info('Transcribing...');

            // Resolving Usernames
            const filesWithNames = await Promise.all(recordedFiles.map(async (file) => {
                let displayName = `USER_${file.userId}`;
                try {
                    const member = await this.channel.guild.members.fetch(file.userId).catch(() => null);
                    if (member) {
                        displayName = member.displayName; // or member.user.username
                    } else {
                        // Try cache if fetch fails
                        const user = this.client.users.cache.get(file.userId);
                        if (user) displayName = user.username;
                    }
                } catch (e) {
                    logger.warn(`Could not resolve name for user ${file.userId}`);
                }
                return { ...file, displayName };
            }));

            const transcriptions = await transcribeSession(filesWithNames, this.sessionDir);

            // Merge into timeline
            const outputFilename = `meeting_${this.sessionId}.txt`;
            const outputPath = path.join(TRANSCRIPTS_DIR, outputFilename);

            await mergeTimeline(transcriptions, outputPath, this.startTime);

            logger.success(`Transcript saved: ${outputFilename}`);

            // Upload transcript to channel
            await this.uploadTranscript(outputPath, outputFilename);

            // Cleanup temp files if enabled
            if (process.env.CLEANUP_TEMP_FILES !== 'false') {
                const audioFiles = recordedFiles.map(f => f.path);
                const wavFiles = recordedFiles.map(f => f.path.replace(/\.(pcm|ogg)$/, '.wav'));
                await removeFiles([...audioFiles, ...wavFiles]);
                logger.info('Cleaned up temporary audio files');
            }
        } catch (error) {
            logger.error('Transcription failed:', error);
            await this.sendMessage('⚠️ Recording failed — Could not generate transcript');
        }
    }

    /**
     * Upload transcript file to voice text channel
     */
    async uploadTranscript(filePath, filename) {
        try {
            await this.channel.send({
                content: `✅ Transcript ready — ${filename}`,
                files: [filePath],
            });
            logger.success(`Uploaded transcript: ${filename}`);
        } catch (error) {
            logger.error('Failed to upload transcript:', error);
        }
    }

    /**
     * Send a message to the voice channel's text chat
     */
    async sendMessage(content) {
        try {
            await this.channel.send(content);
        } catch (error) {
            logger.error('Failed to send message:', error);
        }
    }
}

module.exports = RecordingSession;

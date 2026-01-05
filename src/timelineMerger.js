const fs = require('fs');
const path = require('path');
const { DateTime } = require('luxon');
const logger = require('./utils/logger');

const TIMEZONE = 'Europe/Istanbul';

/**
 * Format seconds to HH:MM:SS
 */
function formatTimestamp(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Merge multiple user transcriptions into a single timeline
 * Uses speaker labels from pyannote diarization
 */
async function mergeTimeline(transcriptions, outputPath, sessionStartTime) {
    // Collect all segments with speaker info
    const allSegments = [];

    for (const transcription of transcriptions) {
        const { segments } = transcription;

        for (const segment of segments) {
            allSegments.push({
                start: segment.start,
                end: segment.end,
                text: segment.text,
                speaker: segment.speaker || 'UNKNOWN',
            });
        }
    }

    // Sort by start time
    allSegments.sort((a, b) => a.start - b.start);

    // Format output
    const lines = [];

    // Header
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`MEETING TRANSCRIPT`);
    lines.push(`Date: ${sessionStartTime.toFormat('yyyy-MM-dd')}`);
    lines.push(`Time: ${sessionStartTime.toFormat('HH:mm:ss')} (Europe/Istanbul)`);
    lines.push(`Segments: ${allSegments.length}`);
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    // Content with speaker labels
    for (const segment of allSegments) {
        const timestamp = formatTimestamp(segment.start);
        const speaker = segment.speaker;
        const text = segment.text.trim();

        if (text) {
            lines.push(`[${timestamp}] <${speaker}>: ${text}`);
        }
    }

    // Footer
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`END OF TRANSCRIPT`);
    lines.push('═══════════════════════════════════════════════════════════════');

    // Write to file
    const content = lines.join('\n');
    fs.writeFileSync(outputPath, content, 'utf-8');

    logger.success(`Timeline merged: ${allSegments.length} segments → ${path.basename(outputPath)}`);

    return outputPath;
}

module.exports = {
    mergeTimeline,
    formatTimestamp,
};

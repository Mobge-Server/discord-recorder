require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.DEEPGRAM_API_KEY;
const FILE_PATH = process.argv[2];

if (!FILE_PATH || !fs.existsSync(FILE_PATH)) {
    console.error('File not found:', FILE_PATH);
    process.exit(1);
}

(async () => {
    console.log(`Reading file: ${FILE_PATH}`);
    console.log(`Size: ${(fs.statSync(FILE_PATH).size / 1024 / 1024).toFixed(2)} MB`);
    console.log('Uploading to Deepgram (Nova-2)...');

    const audioData = fs.readFileSync(FILE_PATH);

    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true&detect_language=true', {
        method: 'POST',
        headers: {
            'Authorization': `Token ${API_KEY}`,
            'Content-Type': 'audio/mpeg',
        },
        body: audioData,
    });

    if (!response.ok) {
        console.error('Deepgram API Error:', response.status, response.statusText);
        console.error(await response.text());
        process.exit(1);
    }

    const result = await response.json();
    console.log('Transcription complete! Formatting...');

    // Format output
    let output = `TRANSCRIPT FOR: ${FILE_PATH}\n`;
    output += `DATE: ${new Date().toLocaleString()}\n`;
    output += `--------------------------------------------------\n\n`;

    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];

    // Check if result has paragraphs (Deepgram Smart Format)
    // Actually relying on words for diarization is better manual reconstruction

    let currentSpeaker = null;
    let currentText = '';
    let startTime = 0;

    for (const word of words) {
        if (word.speaker !== currentSpeaker) {
            if (currentText) {
                const timestamp = new Date(startTime * 1000).toISOString().substr(11, 8);
                output += `[${timestamp}] Speaker ${currentSpeaker}: ${currentText.trim()}\n\n`;
            }
            currentSpeaker = word.speaker;
            currentText = '';
            startTime = word.start;
        }
        currentText += word.punctuated_word + ' ';
    }
    if (currentText) {
        const timestamp = new Date(startTime * 1000).toISOString().substr(11, 8);
        output += `[${timestamp}] Speaker ${currentSpeaker}: ${currentText.trim()}\n\n`;
    }

    const transcriptPath = path.join(path.dirname(FILE_PATH), 'RESCUED_TRANSCRIPT.txt');
    fs.writeFileSync(transcriptPath, output);
    console.log(`✅ Saved transcript to: ${transcriptPath}`);

    // Print first few lines
    console.log('\nPreview:');
    console.log(output.substring(0, 500) + '...');

})();

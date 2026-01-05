// Test WebSocket connection to Discord Voice
const WebSocket = require('ws');

console.log('Testing WebSocket to Discord...');

const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');

ws.on('open', () => {
    console.log('✅ WebSocket connected to Discord gateway!');
    ws.close();
    process.exit(0);
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

ws.on('close', (code, reason) => {
    console.log(`WebSocket closed: ${code} - ${reason}`);
});

setTimeout(() => {
    console.log('❌ Timeout - no connection after 15 seconds');
    process.exit(1);
}, 15000);

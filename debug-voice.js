// Discord.js v14 voice adapter workaround test
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const {
    joinVoiceChannel,
    VoiceConnectionStatus,
    entersState,
    DiscordGatewayAdapterCreator,
    generateDependencyReport
} = require('@discordjs/voice');

console.log('=== Voice Adapter Workaround Test ===\n');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, // Add this
    ],
});

// Custom adapter creator with debugging
function createVoiceAdapterCreator(guild) {
    return (methods) => {
        const { onVoiceStateUpdate, onVoiceServerUpdate, destroy } = methods;

        // Subscribe to voice state updates
        client.ws.on('VOICE_STATE_UPDATE', (data) => {
            console.log(`[WS] VOICE_STATE_UPDATE for guild ${data.guild_id}`);
            if (data.guild_id === guild.id) {
                onVoiceStateUpdate(data);
            }
        });

        // Subscribe to voice server updates  
        client.ws.on('VOICE_SERVER_UPDATE', (data) => {
            console.log(`[WS] VOICE_SERVER_UPDATE for guild ${data.guild_id}:`, data.endpoint);
            if (data.guild_id === guild.id) {
                onVoiceServerUpdate(data);
            }
        });

        // Send voice state update
        const sendPayload = (data) => {
            try {
                guild.shard.send(data);
                console.log(`[WS] Sent payload: OPCODE ${data.op}`);
                return true;
            } catch (e) {
                console.error('[WS] Failed to send payload:', e);
                return false;
            }
        };

        return {
            sendPayload,
            destroy,
        };
    };
}

client.once('ready', async () => {
    console.log(`Bot ready: ${client.user.tag}\n`);

    for (const guild of client.guilds.cache.values()) {
        for (const channel of guild.channels.cache.values()) {
            if (channel.type === 2) {
                const members = channel.members.filter(m => !m.user.bot);
                if (members.size >= 2) {
                    console.log(`=== Joining: ${channel.name} ===`);
                    console.log(`Using CUSTOM adapter creator\n`);

                    const connection = joinVoiceChannel({
                        channelId: channel.id,
                        guildId: guild.id,
                        adapterCreator: createVoiceAdapterCreator(guild),
                        selfDeaf: false,
                        selfMute: true,
                    });

                    connection.on('stateChange', (oldState, newState) => {
                        console.log(`[STATE] ${oldState.status} -> ${newState.status}`);
                    });

                    connection.on('error', (error) => {
                        console.error('[ERROR]', error.message);
                    });

                    console.log('Waiting for Ready state (30s)...');

                    try {
                        await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
                        console.log('\n✅ CONNECTED!');
                        setTimeout(() => {
                            connection.destroy();
                            process.exit(0);
                        }, 2000);
                    } catch (error) {
                        console.error('\n❌ Failed:', error.message);
                        connection.destroy();
                        process.exit(1);
                    }
                    return;
                }
            }
        }
    }

    console.log('No suitable channel');
    process.exit(1);
});

client.login(process.env.DISCORD_TOKEN);

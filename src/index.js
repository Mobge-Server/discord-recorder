require('dotenv').config();

// Fix SSL issues on MacOS (WhisperX model download)
if (process.platform === 'darwin') {
  process.env.SSL_CERT_FILE = "/Library/Frameworks/Python.framework/Versions/3.12/lib/python3.12/site-packages/certifi/cacert.pem";
}
// Disable alignment to avoid PyTorch 2.6 crash
process.env.ALIGN_TRANSCRIPTS = "false";
const { Client, GatewayIntentBits, ChannelType, Events } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const RecordingSession = require('./RecordingSession');
const logger = require('./utils/logger');

// Validate required env
if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is required in .env file');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences,
  ],
  presence: {
    status: 'online',
    activities: [{
      name: 'voice channels',
      type: 3, // Watching
    }],
  },
});

// Active recording session (only one at a time for MVP)
let activeSession = null;

/**
 * Count human members in a voice channel (excluding bots)
 */
function countHumans(channel) {
  return channel.members.filter(member => !member.user.bot).size;
}

/**
 * Get the text channel associated with a voice channel
 * For voice channels, we can send messages directly to the voice channel
 */
function getVoiceTextChannel(voiceChannel) {
  // In Discord, voice channels can receive text messages directly
  return voiceChannel;
}

/**
 * Handle voice state updates - detect when to start/stop recording
 */
async function handleVoiceStateUpdate(oldState, newState) {
  // Get the relevant channel (new or old)
  const channel = newState.channel || oldState.channel;
  if (!channel) return;

  // Skip if guild restriction is set and doesn't match
  if (process.env.GUILD_ID && channel.guild.id !== process.env.GUILD_ID) {
    return;
  }

  const humanCount = channel ? countHumans(channel) : 0;

  /* Auto-start logic removed */

  // --- STOP RECORDING CHECK ---
  // Always check the active session's channel if we have one
  if (activeSession) {
    const sessionChannel = client.channels.cache.get(activeSession.channelId);

    if (sessionChannel) {
      const currentHumans = countHumans(sessionChannel);

      if (currentHumans === 0) {
        logger.info(`No humans left in ${sessionChannel.name}, stopping recording...`);

        try {
          await activeSession.stop();
        } catch (error) {
          logger.error('Failed to stop recording session:', error);
        } finally {
          activeSession = null;
        }
        return; // Stopped, so don't process START logic below for this event
      }
    } else {
      // Channel might have been deleted? Stop safely.
      logger.warn('Recorder channel not found, stopping session.');
      try { await activeSession.stop(); } catch (e) { } finally { activeSession = null; }
      return;
    }
  }

  /* 
   * AUTOMATIC RECORDING & SWITCHING DISABLED
   * Only Manual /record and /end_recording commands are active.
   */
}

// Slash Command Handler
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'record') {
    const channel = interaction.member.voice.channel;
    if (!channel) {
      return interaction.reply({ content: '❌ Lütfen önce bir ses kanalına katılın!', ephemeral: true });
    }

    if (activeSession) {
      return interaction.reply({ content: `⚠️ Zaten **${activeSession.channel.name}** kanalında kayıttayım.`, ephemeral: true });
    }

    try {
      await interaction.reply(`🔴 **${channel.name}** kanalında kayıt başlatılıyor...`);
      activeSession = new RecordingSession(channel, client);
      await activeSession.start();
    } catch (error) {
      logger.error('Manual recording start failed:', error);
      activeSession = null;
      await interaction.editReply('❌ Kayıt başlatılırken bir hata oluştu.');
    }
  }

  if (interaction.commandName === 'end_recording' || interaction.commandName === 'stop') {
    if (!activeSession) {
      return interaction.reply({ content: '⚠️ Şu an aktif bir kayıt yok.', ephemeral: true });
    }

    try {
      await interaction.reply('⏳ Kayıt durduruluyor ve transkript oluşturuluyor...');
      await activeSession.stop();
      activeSession = null;
      await interaction.followUp('✅ Kayıt durduruldu. Ses dosyası ve transkript hazırlanıyor...');
    } catch (error) {
      logger.error('Manual recording stop failed:', error);
      activeSession = null;
      await interaction.editReply('❌ Kayıt durdurulurken bir hata oluştu.');
    }
  }
});

// Event handlers
client.once(Events.ClientReady, (c) => {
  logger.info(`Bot is ready! Logged in as ${c.user.tag}`);
  logger.info(`Monitoring voice channels for 2+ humans...`);

  if (process.env.GUILD_ID) {
    logger.info(`Guild restriction: ${process.env.GUILD_ID}`);
  }
});

client.on(Events.VoiceStateUpdate, handleVoiceStateUpdate);

client.on(Events.Error, (error) => {
  logger.error('Discord client error:', error);
});

// Graceful shutdown
// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');

  if (activeSession) {
    try {
      await activeSession.stop();
    } catch (error) {
      logger.error('Error stopping session on shutdown:', error);
    }
  }

  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot
client.login(process.env.DISCORD_TOKEN);

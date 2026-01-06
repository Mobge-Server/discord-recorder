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

// --- CLIENT POOL SETUP ---
const allTokens = [process.env.DISCORD_TOKEN];
if (process.env.WORKER_TOKENS) {
  const workers = process.env.WORKER_TOKENS.split(',').map(t => t.trim()).filter(t => t.length > 0);
  allTokens.push(...workers);
}

const clients = [];
const readyClients = new Set();

// Active recording sessions (Channel ID -> { session: RecordingSession, client: Client })
// We index by Channel ID because that's unique per parallel recording
const sessions = new Map();

/**
 * Initialize a single Discord client
 */
function createClient(token, index) {
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
        name: index === 0 ? 'commands' : `Recorder #${index}`,
        type: 3, // Watching
      }],
    },
  });

  // --- EVENT HANDLERS ---

  client.once(Events.ClientReady, (c) => {
    logger.info(`Bot #${index} ready! Logged in as ${c.user.tag}`);
    readyClients.add(client);
  });

  client.on(Events.Error, (error) => {
    logger.error(`Client #${index} error:`, error);
  });

  // Only the MAIN bot (index 0) handles interaction commands
  if (index === 0) {
    client.on(Events.InteractionCreate, handleInteraction);
  }

  // All bots listen to voice state updates to detect when THEY are alone or need to stop
  client.on(Events.VoiceStateUpdate, (oldState, newState) => handleVoiceStateUpdate(client, oldState, newState));

  client.login(token).catch(err => {
    logger.error(`Failed to login bot #${index}:`, err);
  });

  return client;
}

// Initialize all clients
logger.info(`Initializing ${allTokens.length} bot(s)...`);
allTokens.forEach((token, index) => {
  clients.push(createClient(token, index));
});

const mainClient = clients[0]; // The one that handles /slash commands

/**
 * Count human members in a voice channel (excluding bots)
 */
function countHumans(channel) {
  return channel.members.filter(member => !member.user.bot).size;
}

/**
 * Handle voice state updates for a specific client
 */
async function handleVoiceStateUpdate(client, oldState, newState) {
  const channel = newState.channel || oldState.channel;
  if (!channel) return;

  // We only care if THIS client is involved in a session
  // Find if there is a session for this channel (or the old one) logic is complex because 
  // we map by ChannelID.

  // Use guild lookup for safety or iterate sessions
  // Optimization: check if 'client.user.id' is in the channel?

  // Simplified logic: If we have a session for this channel, check empty state
  const channelId = channel.id;
  const sessionData = sessions.get(channelId);

  if (sessionData && sessionData.client.user.id === client.user.id) {
    const session = sessionData.session;
    const sessionChannel = client.channels.cache.get(session.channelId);

    if (sessionChannel) {
      const currentHumans = countHumans(sessionChannel);
      if (currentHumans === 0) {
        logger.info(`No humans left in ${sessionChannel.name}, stopping recording...`);
        try {
          await session.stop();
        } catch (e) {
          logger.error('Stop error:', e);
        } finally {
          sessions.delete(channelId);
        }
      }
    }
  }
}

/**
 * Find an available worker bot for a guild
 * A bot is available if it is NOT currently connected to any voice channel in this guild
 */
function getAvailableClient(guildId) {
  for (const client of clients) {
    if (!readyClients.has(client)) continue;

    // Check if this client is already in a voice channel IN THIS GUILD
    const guild = client.guilds.cache.get(guildId);
    if (!guild) continue; // Bot not in guild?

    const myVoiceState = guild.members.me?.voice;
    if (!myVoiceState || !myVoiceState.channelId) {
      return client; // Found one!
    }
  }
  return null;
}

/**
 * Handle Slash Commands (Main Bot Only)
 */
async function handleInteraction(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guildId;
  if (!guildId) return;

  // /record
  if (interaction.commandName === 'record') {
    const memberVoice = interaction.member.voice;
    if (!memberVoice || !memberVoice.channelId) {
      return interaction.reply({ content: '❌ Lütfen önce bir ses kanalına katılın!', ephemeral: true });
    }

    const targetChannelId = memberVoice.channelId;
    const targetChannelName = memberVoice.channel ? memberVoice.channel.name : 'Unknown';

    // Check if ALREADY recording this channel
    if (sessions.has(targetChannelId)) {
      return interaction.reply({ content: `⚠️ **${targetChannelName}** kanalı zaten kaydediliyor.`, ephemeral: true });
    }

    // Find available worker
    const workerClient = getAvailableClient(guildId);

    if (!workerClient) {
      return interaction.reply({ content: `⚠️ Şu an tüm kayıt botları meşgul veya bu sunucuda başka bir kanalda.`, ephemeral: true });
    }

    try {
      await interaction.reply(`🔴 **${targetChannelName}** kanalına ${workerClient.user.username} bağlanıyor...`);

      // We need to get the Channel object from the WORKER's perspective/cache
      const workerGuild = await workerClient.guilds.fetch(guildId);
      const workerChannel = await workerGuild.channels.fetch(targetChannelId);

      const newSession = new RecordingSession(workerChannel, workerClient);

      sessions.set(targetChannelId, {
        session: newSession,
        client: workerClient
      });

      await newSession.start();

    } catch (error) {
      logger.error('Start failed:', error);
      sessions.delete(targetChannelId);
      await interaction.editReply('❌ Kayıt başlatılamadı: ' + error.message);
    }
  }

  // /end_recording
  if (interaction.commandName === 'end_recording' || interaction.commandName === 'stop') {
    // Find session for user's current channel
    const memberVoice = interaction.member.voice;
    const channelId = memberVoice ? memberVoice.channelId : null;

    // If user is not in a channel, or we don't have a session for that channel
    // Maybe allow stopping ANY session in the guild if user is admin?
    // For now, simple logic: User must be in the recorded channel

    let sessionData = channelId ? sessions.get(channelId) : null;

    if (!sessionData) {
      // Fallback: If user is not in channel, check if there is ONLY ONE session in this guild?
      // TODO: Implement cleaner lookup
      return interaction.reply({ content: '⚠️ Bulunduğunuz kanalda aktif bir kayıt yok.', ephemeral: true });
    }

    try {
      await interaction.reply('⏳ Kayıt durduruluyor...');
      sessions.delete(channelId); // Remove immediately

      await sessionData.session.stop();

      await interaction.followUp('✅ Kayıt durduruldu. Transkript hazırlanıyor...');
    } catch (error) {
      logger.error('Stop failed:', error);
      await interaction.editReply('❌ Hata oluştu.');
    }
  }
}

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down...');

  for (const [channelId, data] of sessions) {
    try {
      await data.session.stop();
    } catch (e) { }
  }

  clients.forEach(c => c.destroy());
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

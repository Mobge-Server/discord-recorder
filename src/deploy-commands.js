require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('record')
        .setDescription('Bulunduğunuz ses kanalında kaydı başlatır'),
    new SlashCommandBuilder()
        .setName('end_recording')
        .setDescription('Kaydı durdurur ve transkripti oluşturur'),
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Slash komutları yükleniyor...');

        // Kullanıcı ID'leri
        const CLIENT_ID = '1457376615456706602';
        const GUILD_ID = '626008928605700097';

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Slash komutları başarıyla yüklendi!');
    } catch (error) {
        console.error(error);
    }
})();

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
        // Kullanıcı ID'leri
        const CLIENT_ID = process.env.CLIENT_ID;
        const GUILD_ID = process.env.GUILD_ID;

        if (!CLIENT_ID || !GUILD_ID) {
            console.error('Hata: CLIENT_ID veya GUILD_ID .env dosyasında tanımlanmamış!');
            process.exit(1);
        }

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Slash komutları başarıyla yüklendi!');
    } catch (error) {
        console.error(error);
    }
})();

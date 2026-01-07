# Discord Recorder & Transcriber

Discord ses kanallarındaki konuşmaları kaydeden, yapay zeka ile metne döken ve sonucu kanala ileten bot uygulaması.

> **Not:** Bu dokümantasyon projenin teknik yapısını, mimarisini ve bileşenlerini açıklar. Kurulum ve kullanım için [README.md](../README.md) dosyasına bakınız.

## Teknoloji Stack

- **Runtime:** Node.js
- **Bot Framework:** discord.js & @discordjs/voice
- **Audio Processing:** ffmpeg, prism-media, opusscript
- **Transcription:** Deepgram API (Cloud) / WhisperX (Local)
- **Utilities:** luxon (zaman yönetimi), dotenv (konfigürasyon)

## Mevcut Durum

Proje aktif geliştirme aşamasındadır. Temel özellikler:
- Ses kanalına bağlanma ve dinleme
- Kullanıcı bazlı ses kaydı (Opus stream)
- Karmaşık ses işleme pipeline'ı (Opus -> PCM -> WAV)
- Cloud (Deepgram) ve Local (WhisperX) transkripsiyon desteği
- Slash komutları ile yönetim

## Dokümantasyon Haritası

- [Sistem Mimarisi](./architecture.md): Sistemin genel çalışma mantığı ve bileşenler arası ilişkiler.
- [Dizin Yapısı](./structure.md): Proje dosya organizasyonu ve sorumluluklar.
- **Modüller:**
    - [Bot Core](./modules/bot-core.md): Botun ana yaşam döngüsü ve komut yönetimi.
    - [Recorder](./modules/recorder.md): Ses kayıt ve işleme mekanizması.
    - [Transcriber](./modules/transcriber.md): Ses-metin dönüşüm servisleri.
- [Deployment ve VPN](./deployment.md): Coolify ve Tailscale kurulum rehberi.

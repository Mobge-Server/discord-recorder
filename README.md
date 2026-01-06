# Discord Voice Recorder & Transcriber

Bu Discord botu, ses kanallarındaki konuşmaları kaydeder ve yapay zeka ile metne dökerek (transkripsiyon) kanala gönderir.

## Özellikler

- **Yüksek Kaliteli Kayıt:** Sesleri MP3 formatında (64kbps Mono) kaydederek bant genişliği ve depolama alanından tasarruf eder.
- **Hızlı Transkripsiyon:** Deepgram API ile saniyeler içinde metne döküm (Cloud Modu).
- **Yerel Mod Desteği (Opsiyonel):** WhisperX ile tamamen yerel çalışabilme (GPU gerektirir, şu an Cloud modu aktif).
- **Kolay Kontrol:** `/record` ve `/end_recording` slash komutları ile yönetim.
- **Otomatik Temizlik:** İşlem bitince geçici ses dosyalarını siler.

## Kurulum

1. **Gereksinimler:**
   - Node.js (v18+)
   - Python 3.10+ (Sadece yerel WhisperX modu için)
   - FFmpeg (`brew install ffmpeg`)

2. **Paketleri Yükleyin:**
   ```bash
   npm install
   ```

3. **Çevresel Değişkenler (.env):**
   Bir `.env` dosyası oluşturun ve aşağıdaki bilgileri girin:
   ```env
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_client_id
   GUILD_ID=your_server_id (Opsiyonel, development için)
   
   # Transkripsiyon Modu (cloud veya local)
   STT_MODE=cloud
   DEEPGRAM_API_KEY=your_deepgram_key
   ```

4. **Komutları Yükleyin:**
   ```bash
   node src/deploy-commands.js
   ```

5. **Botu Başlatın:**
   ```bash
   node src/index.js
   ```

## Kullanım

Botu sunucunuzda bir ses kanalına çağırın:

- **/record**: Bulunduğunuz ses kanalında kaydı başlatır.
- **/end_recording** (veya **/stop**): Kaydı bitirir, ses dosyasını işler ve metin dosyasını kanala yükler.

## Notlar

- Mac (Apple Silicon) üzerinde `opusscript` ve `ffmpeg` kullanılarak native modül sorunları aşılmıştır.
- Cloud modu (Deepgram) varsayılan ve önerilen moddur. Yerel mod için `whisperx` kurulumu gerekir.

## Yönetim ve İpuçları

**Botu Yeniden Başlatma (Restart):**
Eğer bot takılırsa, bağlantı sorunu yaşarsa veya `.env` değişikliği yaparsanız aşağıdaki komutla güvenli bir şekilde yeniden başlatabilirsiniz:

```bash
kill $(pgrep -f "node src/index.js") || true && sleep 2 && node src/index.js
```

**Paralel Kayıt (Multi-Bot):**
Aynı sunucuda birden fazla kanalı aynı anda kaydetmek için ek botlara ihtiyacınız vardır.
1. Yeni botlar oluşturun ve sunucuya davet edin (Privileged Intents açık olmalı).
2. `.env` dosyasına tokenlarını ekleyin:
   ```env
   WORKER_TOKENS=ikinci_bot_token,ucuncu_bot_token
   ```
3. Botu yeniden başlatın. `/record` komutu otomatik olarak boşta olan botu yönlendirecektir.

## Lisans


MIT

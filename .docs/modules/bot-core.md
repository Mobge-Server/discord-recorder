# Bot Core Modülü

Botun yaşam döngüsünü, olay yönetimini ve etkileşim katmanını yöneten çekirdek modül.

## Kapsam
Bu modül aşağıdaki dosyaları kapsar:
- `src/index.js`
- `src/deploy-commands.js`
- `src/process-recording.js`
- `src/rescue-transcript.js`

## Bileşenler

### 1. Main Entry Point (`index.js`)
Uygulamanın kalbidir.
- **Görevleri:**
    - Discord Client'ını başlatır (`GatewayIntentBits` ile).
    - `VoiceStateUpdate` olaylarını dinler (kullanıcı kanala girdi/çıktı).
    - `InteractionCreate` olaylarını dinler (komut geldi).
    - `Map<GuildID, RecordingSession>` yapısı ile aktif kayıtları bellekte tutar.

### 2. Command Deployer (`deploy-commands.js`)
Slash komutlarını Discord API'ye kaydeder.
- **Komutlar:**
    - `/record`: Kaydı başlatır.
    - `/end_recording`: Kaydı bitirir ve işlemeyi tetikler.

### 3. Process Orchestrator (`process-recording.js`)
Kayıt bittikten sonraki süreci yönetir.
- **Akış:**
    1. Ham kayıt dosyalarını toplar.
    2. `audioConverter`'ı çağırarak formatlar.
    3. `transcriber`'ı çağırarak metne döker.
    4. Sonuçları (`.txt` ve `.mp3`) Discord kanalına yükler.
    5. Geçici dosyaları temizler.

### 4. Rescue Utility (`rescue-transcript.js`)
Bir hata durumunda (örn. bot çökerse) yarım kalan kayıt dosyalarını kurtarmak ve manuel olarak işlemeye devam etmek için kullanılan yardımcı scripttir.

## Olay Döngüsü (Event Loop)

1. **Başlangıç:** `client.login(TOKEN)`
2. **Komut:** `/record` -> `handleCommand()` -> `startRecording()`
3. **Kayıt:** `RecordingSession` aktif kalır, ses verisi akar.
4. **Bitiş:** `/end_recording` -> `stopRecording()` -> `processRecording()`

## Hata Yönetimi
- Beklenmeyen hatalar (`process.on('uncaughtException')`) yakalanır ancak botun çalışmaya devam etmesi için mimari izole edilmiştir.
- API hataları (Deepgram, Discord) kullanıcıya mesaj olarak bildirilir.

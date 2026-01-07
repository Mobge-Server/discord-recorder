# Recorder Modülü

Discord ses kanallarından gelen ses verilerini yakalayan ve işleyen modül.

## Kapsam
Bu modül aşağıdaki dosyaları kapsar:
- `src/audioRecorder.js`
- `src/RecordingSession.js`

## Bileşenler

### 1. Recording Session (`RecordingSession.js`)
Bir sunucudaki (Guild) aktif kayıt oturumunu temsil eder.
- **State:**
    - `connection`: Ses kanalı bağlantısı.
    - `receiver`: Ses alıcısı.
    - `startTime`: Kayıt başlangıç zamanı.
    - `userIds`: Kaydedilen kullanıcı listesi.
- **Sorumluluk:** Hangi kullanıcının ne zaman konuştuğunu ve hangi dosyaya yazıldığını takip eder.

### 2. Audio Recorder Logic (`audioRecorder.js`)
Düşük seviyeli ses işleme mantığı buradadır.
- **Voice Connection:** `@discordjs/voice` kütüphanesini kullanır.
- **Opus Stream:** Discord'dan gelen şifreli ve sıkıştırılmış Opus paketlerini dinler.
- **Pipeline:**
    ```
    Opus Packet -> Opus Decoder -> PCM Stream -> File Writer
    ```

## Teknik Detaylar

### Ses Akışı (Stream) Yönetimi
Her kullanıcı konuştuğunda Discord bir `speaking` olayı tetikler.
Recorder modülü bu olayı yakalar ve:
1. O kullanıcı için bir `AudioReceiveStream` oluşturur.
2. Gelen paketi `prism-media` ile decode eder (Opus -> PCM).
3. PCM verisini binary olarak diske (`.pcm` veya `.k16`) yazar.

### Dosya İsimlendirme
Dosyalar geçici klasörde kullanıcı ID'si ve timestamp ile saklanır:
`recordings/<guild_id>_<user_id>_<timestamp>.pcm`

## Önemli Notlar
- **Silence Handling:** Kullanıcı sustuğunda stream otomatik kapanmaz, belirli bir timeout veya manuel bitirme gerekir.
- **Memory Leak:** Stream'lerin işi bitince `destroy()` edilmesi kritiktir, aksi takdirde memory leak oluşur.

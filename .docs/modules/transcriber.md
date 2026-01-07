# Transcriber Modülü

Kaydedilen ham ses verilerini işlenebilir formata çeviren ve metne dönüştüren modül.

## Kapsam
Bu modül aşağıdaki dosyaları kapsar:
- `src/transcriber.js`
- `src/audioConverter.js`

## Bileşenler

### 1. Audio Converter (`audioConverter.js`)
Ham ses dosyalarını (PCM) standart formatlara (WAV/MP3) dönüştürür.
- **Araç:** `ffmpeg` (Child Process olarak çalıştırılır).
- **Girdi:** 48kHz, 2 Kanal, Signed 16-bit Little Endian PCM.
- **Çıktı:** 
    - Transkripsiyon için: WAV (yüksek kalite).
    - Arşiv için: MP3 (düşük boyut).

### 2. Transcriber Service (`transcriber.js`)
Ses dosyasını metne çevirir. İki modda çalışabilir:

#### Mod A: Cloud (Deepgram)
- **Hız:** Çok hızlı (saniyeler içinde).
- **Yöntem:** Ses dosyası Deepgram API'ye POST edilir.
- **Config:** `.env` dosyasında `STT_MODE=cloud` ve `DEEPGRAM_API_KEY` gerektirir.
- **Özellikler:** Noktalama işaretleri, konuşmacı ayrımı (diarization) desteği.

#### Mod B: Local (WhisperX)
- **Gizlilik:** Veri dışarı çıkmaz.
- **Donanım:** Güçlü CPU/GPU gerektirir.
- **Yöntem:** Yerel Python scripti (`whisperx`) çalıştırılır.
- **Config:** `STT_MODE=local`.

## İşlem Akışı

1. `process-recording.js` ilgili dosyaları `audioConverter`'a gönderir.
2. Dönüştürülen dosyalar `transcriber.js`'e iletilir.
3. Transcriber, seçilen moda göre (Cloud/Local) işlemi yapar.
4. Sonuç (String) geri döndürülür.

## Bağımlılıklar
- **FFmpeg:** Sistemde kurulu olmalıdır.
- **Deepgram SDK:** `@deepgram/sdk` (Cloud modu için).
- **Python & Whisper:** (Sadece Local mod için).

# Proje ve Dizin Yapısı

Bu doküman, projenin fiziksel dosya organizasyonunu ve her birimin sorumluluğunu açıklar.

## Dizin Ağacı

```
/
├── .docs/                  # Proje dokümantasyonu (Bu dizin)
├── src/                    # Kaynak kodlar
│   ├── utils/              # Yardımcı fonksiyonlar
│   ├── audioConverter.js   # Ses formatı dönüştürücü (PCM -> WAV / MP3)
│   ├── audioRecorder.js    # Ses kayıt mantığı ve stream yönetimi
│   ├── deploy-commands.js  # Slash komutlarını Discord'a kaydetme scripti
│   ├── index.js            # Uygulama giriş noktası (Main)
│   ├── process-recording.js# Kayıt sonrası işlem orkestratörü
│   ├── RecordingSession.js # Bir kayıt oturumunun state yönetimi
│   ├── rescue-transcript.js# Hata durumunda kurtarma (Utility)
│   ├── timelineMerger.js   # (Opsiyonel) Ses zaman çizelgesi birleştirici
│   ├── transcriber.js      # STT (Speech-to-Text) servis entegrasyonu
│   └── test-ws.js          # WebSocket test aracı
├── .env                    # Çevresel değişkenler (Token, API Key)
├── Dockerfile              # Container yapılandırması
├── docker-compose.yml      # Docker servis tanımı
└── package.json            # Bağımlılıklar ve scriptler
```

## Önemli Dosyalar ve Sorumlulukları

| Dosya | Tür | Sorumluluk |
|-------|-----|------------|
| `src/index.js` | **Core** | Botu başlatır, event listener'ları kurar, komutları yönlendirir. |
| `src/audioRecorder.js` | **Module** | Discord ses bağlantısını yönetir, kullanıcı seslerini dosya sistemine yazar. |
| `src/transcriber.js` | **Service** | Ses dosyalarını alır, Deepgram veya WhisperX ile metne çevirir. |
| `src/RecordingSession.js` | **Model** | Aktif bir kaydın durumunu (başlangıç zamanı, kullanıcılar, kanal) tutar. |
| `src/deploy-commands.js` | **Script** | `/record` gibi komutların Discord API'ye tanımlanmasını sağlar (Setup aşamasında çalışır). |

## Veri Akışı ve Dosya Etkileşimi

1. `index.js` komutu alır -> `RecordingSession` başlatır.
2. `RecordingSession` -> `audioRecorder.js`'yi tetikler.
3. `audioRecorder.js` -> Ses dosyalarını (PCM/Opus) diske yazar.
4. Kayıt bitince `process-recording.js` devreye girer.
5. `process-recording.js` -> `audioConverter.js` ile formatlar -> `transcriber.js` ile metne çevirir.
6. Sonuç `index.js` üzerinden kullanıcıya döner.

# Coolify & Tailscale ile Deployment

Bu proje, Coolify üzerinde barındırılmak üzere yapılandırılmıştır. Türkiye'deki Discord erişim kısıtlamaları nedeniyle, bot trafiği bir Tailscale exit node üzerinden yönlendirilmektedir.

## Mimari

Bot container'ı içinde `tailscaled` (Tailscale daemon) çalışır. Başlangıçta verilen bir Auth Key ile Tailscale ağına bağlanır ve belirtilen bir Exit Node üzerinden internete çıkar.

```mermaid
graph LR
    subgraph "Coolify Server (TR)"
        A[Discord Recorder Container]
        subgraph "Container İçeriği"
            B[Node.js App] --> C[Tailscale Daemon]
        end
    end
    
    subgraph "Tailscale Network"
        C -->|VPN Tunnel| D[Exit Node (DE/EU)]
    end
    
    D -->|Internet| E[Discord Gateway & Voice Servers]
```

## Gereksinimler

1. **Tailscale Hesabı:** Bir Tailscale ağı oluşturulmalı.
2. **Exit Node:** Yurt dışında (örn. Almanya) çalışan ve Exit Node olarak yapılandırılmış bir cihaz.
3. **Auth Key:** Tailscale Admin Console üzerinden oluşturulmuş, `Reusable` (önerilen) veya `One-off` bir anahtar. Sistem persistence sağladığı için `One-off` anahtarlar da container restartlarında sorun çıkarmaz (ilk seferden sonra state dosyadan okunur).

## Persistence (Kalıcılık)

Docker container'ı yeniden başlatıldığında Tailscale oturumunun ve kayıtların kaybolmaması için Docker Volume'leri kullanılır:

- `tailscale-data`: `/var/lib/tailscale` dizinini tutar. Bu sayede cihaz Tailscale ağında sabit kalır, her restartta yeni cihaz gibi görünmez veya re-auth gerektirmez.
- `recordings-data`: `/app/recordings` dizini (ses kayıtları).
- `transcripts-data`: `/app/transcripts` dizini (çeviri metinleri).

## Kurulum ve Konfigürasyon

### Environment Değişkenleri

Coolify proje ayarlarında aşağıdaki değişkenleri tanımlayınız:

| Değişken | Açıklama |
|----------|----------|
| `TAILSCALE_AUTH_KEY` | `tskey-auth-...` ile başlayan Tailscale yetkilendirme anahtarı. |
| `TAILSCALE_EXIT_NODE_IP` | Trafiğin akacağı Exit Node'un Tailscale IP adresi (örn. `100.x.y.z`). |
| `DISCORD_TOKEN` | Discord Bot Token. |
| `GUILD_ID` | (Opsiyonel) Botun çalışacağı sunucu ID'si. |
| `DEEPGRAM_API_KEY` | Deepgram API anahtarı (Cloud STT için). |

### Docker Compose Yapılandırması

Tailscale'in çalışabilmesi için container'ın ağ yeteneklerine ihtiyacı vardır. `docker-compose.yml` dosyasında şu ayarların olduğundan emin olun:

```yaml
services:
  discord-recorder:
    # ...
    cap_add:
      - NET_ADMIN
    devices:
      - /dev/net/tun
    volumes:
      - recordings-data:/app/recordings
      - transcripts-data:/app/transcripts
      - tailscale-data:/var/lib/tailscale

volumes:
  tailscale-data:
  recordings-data:
  transcripts-data:
```

## Sorun Giderme

- **Bağlantı Hatası:** Container loglarında `tailscale up` komutunun çıktısını kontrol edin. Auth Key süresi dolmuş olabilir.
- **Ses Sorunları:** UDP paketlerinin geçişi için Exit Node'un stabil olduğundan emin olun.

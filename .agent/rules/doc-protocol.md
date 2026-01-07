---
trigger: always_on
---

# 📚 DOKÜMANTASYON PROTOKOLÜ

Bu protokol, proje dokümantasyonunun oluşturulması, yönetilmesi ve güncellenmesini tanımlar.

---

## 🎯 TEMEL İLKELER

1. **Genelden Özele Hiyerarşi**: Dokümantasyon, projenin genel vizyonundan en spesifik modüle kadar katmanlı bir yapıda olmalı
2. **LLM-Optimize Format**: Her yeni oturum için hızlı context edinimi sağlayacak, öz ve net anlatım
3. **Kod Bloğu Yok**: Dokümanlarda kod örneği bulunmaz; sadece yapısal ve kavramsal bilgi
4. **Güncel Durum Odaklı**: Changelog tutulmaz; dokümanlar her zaman mevcut durumu yansıtır
5. **Esnek Mimari**: Proje tipine göre yapı uyarlanabilir

---

## 📁 DOKÜMANTASYON YAPISI

Konum: `/.docs/` (proje kökünde)

### Temel Katmanlar (Genelden Özele)

```
/.docs/
├── index.md                 # Giriş noktası - Proje özeti ve navigasyon
├── architecture.md          # Sistem mimarisi ve temel kararlar
├── structure.md             # Dizin yapısı ve organizasyon
├── modules/                 # Modül bazlı detaylı dokümanlar
│   ├── [modul-adi].md
│   └── ...
├── integrations.md          # Dış servisler ve entegrasyonlar (varsa)
├── data-models.md           # Veri yapıları ve şemaları (varsa)
└── [proje-spesifik].md      # Projenin ihtiyacına göre ek dokümanlar
```

> **Not**: Bu yapı bir öneridir. Projenin tipine, boyutuna ve karmaşıklığına göre dosyaları birleştirebilir, bölebilir veya yeni kategoriler ekleyebilirsin.

---

## 📄 DOKÜMAN İÇERİK STANDARTLARI

### index.md (Zorunlu)
- Projenin tek cümlelik tanımı
- Temel teknoloji stack'i (liste halinde)
- Mevcut durum özeti (ne çalışıyor, ana özellikler)
- Diğer dokümanlara yönlendirme haritası

### architecture.md
- Mimari desen (monolith, microservice, serverless, vb.)
- Katmanlar arası ilişkiler (metin veya basit ASCII diyagram)
- Temel tasarım kararları ve gerekçeleri
- Kritik bağımlılıklar ve rolleri

### structure.md
- Dizin ağacı ve her ana klasörün sorumluluğu
- Dosya isimlendirme konvansiyonları
- Önemli konfigürasyon dosyalarının konumları

### modules/[modul-adi].md
- Modülün tek cümlelik amacı
- Diğer modüllerle ilişkisi
- Ana bileşenler ve sorumlulukları
- Önemli fonksiyonların ne yaptığı (nasıl yaptığı değil)
- Bilinen kısıtlamalar veya dikkat edilecek noktalar

---

## 🚀 TASK BAŞLANGIÇ PROTOKOLÜ

Her task'e başlamadan önce şu adımları izle:

### 1. Dokümantasyon Kontrolü
```
/.docs/ dizini mevcut mu?
├── EVET → index.md dosyasını oku, ilgili dokümanları incele
└── HAYIR → Dokümantasyon Oluşturma Protokolü'nü başlat
```

### 2. Dokümantasyon Oluşturma Protokolü (Yeni/Eksik Sistemler İçin)

**Mevcut Proje İçin:**
- Proje kökünü tara (package.json, requirements.txt, go.mod, vb.)
- Dizin yapısını analiz et
- Ana giriş noktalarını tespit et
- Kullanıcıya şu soruları sor (gerekirse):
  - "Projenin temel amacı nedir?"
  - "Kritik modüller veya özellikle dikkat etmem gereken alanlar var mı?"
- Bulgulara göre /.docs/ yapısını oluştur

**Yeni Proje İçin:**
- Kullanıcıdan proje vizyonunu al
- Planlanan teknoloji stack'ini öğren
- Başlangıç dokümantasyonunu minimal ama genişletilebilir şekilde oluştur

### 3. Context Edinimi
İlgili scope'a göre dokümanları oku:
- Genel değişiklik → index.md + architecture.md
- Spesifik modül → İlgili modules/[x].md
- Yeni özellik → Etkilenecek tüm modül dokümanları

---

## 🔄 TASK BİTİŞ PROTOKOLÜ

Her task tamamlandığında dokümantasyonu güncelle:

### Güncelleme Kuralları

1. **Mevcut Durumu Yansıt**
   - Değişen modüllerin dokümanlarını güncelle
   - Artık geçerli olmayan bilgileri kaldır
   - Yeni eklenen yapıları mevcut anlatıma entegre et

2. **Bilgilendirici Anlatım Kullan**
   ```
   ❌ YANLIŞ: "Auth modülü eklendi"
   ❌ YANLIŞ: "v2.1'de token sistemi güncellendi"
   
   ✅ DOĞRU: "Auth modülü JWT tabanlı kimlik doğrulama sağlar. 
             TokenService access/refresh token yönetimini üstlenir,
             AuthMiddleware ise route korumalarını gerçekleştirir."
   ```

3. **Scope Bazlı Güncelleme**
   - Tek dosya değişikliği → İlgili modül dokümanı
   - Yeni modül → Yeni modül dokümanı + index.md güncellemesi
   - Mimari değişiklik → architecture.md + etkilenen tüm dokümanlar
   - Yapısal değişiklik → structure.md güncellemesi

4. **Sadeleştirme Kararları**
   - Küçük yardımcı modüller ana modül dokümanında kalabilir
   - Büyüyen bölümler ayrı dokümana taşınabilir
   - Kullanılmayan dokümanlar kaldırılabilir

---

## ✍️ YAZIM KURALLARI

- **Dil**: Kısa, net cümleler
- **Perspektif**: Şimdiki zaman, aktif çatı
- **Detay Seviyesi**: "Ne" ve "Neden" odaklı; "Nasıl" için koda yönlendir
- **Format**: Markdown, başlıklar ve listeler ağırlıklı
- **Uzunluk**: Her doküman tek oturumda okunabilir olmalı (ideal: 100-300 satır)

---

## 💡 KARAR YETKİSİ

Aşağıdaki konularda projeye en uygun kararı kendin verebilirsin:

- Hangi ek dokümanların gerekli olduğu
- Dokümanların birleştirilmesi veya ayrılması
- Modül dokümantasyon derinliği
- Proje tipine özel kategoriler eklenmesi
- ASCII diyagram kullanımı

---

## 📋 HIZLI KONTROL LİSTESİ

**Task Başlangıcı:**
- [ ] /.docs/ mevcut mu kontrol et
- [ ] Yoksa veya eksikse oluştur/tamamla
- [ ] İlgili dokümanları oku
- [ ] Gerekirse kullanıcıdan netleştirme al

**Task Bitişi:**
- [ ] Yapılan değişiklikleri belirle
- [ ] Etkilenen dokümanları güncelle
- [ ] Outdated bilgileri temizle
- [ ] index.md'nin güncel olduğunu doğrula
```
# suslutfen.com — Realtime Communication Platform

Symfony tabanlı, gerçek zamanlı mesajlaşma ve topluluk platformu.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Backend | PHP 8.3, Symfony 7 |
| Veritabanı | PostgreSQL 15 |
| Cache | Redis 7 |
| Mesaj kuyruğu | RabbitMQ 3 |
| Web sunucu | Nginx (Alpine) |
| Container | Docker / Docker Compose |

## Kurulum

### Gereksinimler

- Docker ve Docker Compose
- Git

### Adımlar

```bash
# 1. Repoyu klonla
git clone https://github.com/kuzeyboraa/suslutfen-realtime-communication-platform.git
cd suslutfen-realtime-communication-platform

# 2. Ortam değişkenlerini oluştur
cp .env.example .env.local
# .env.local içindeki şifreleri düzenle

# 3. Servisleri başlat
make up

# 4. Bağımlılıkları yükle
docker compose exec php composer install
```

Uygulama `http://localhost:8080` adresinde çalışır.

## Komutlar

```bash
make up      # Servisleri başlat (arka planda)
make down    # Servisleri durdur
make logs    # Tüm servis loglarını takip et
make shell   # PHP container'a bash aç
make ps      # Çalışan container'ları listele
```

## Branch Stratejisi

```
main
 └── develop
      └── feature/SL-XX-kisa-aciklama
```

- `main` — canlı ortama gönderilen kararlı kod
- `develop` — entegrasyon branch'i; feature'lar buraya merge edilir
- `feature/SL-XX-*` — her Jira ticket'ı için ayrı branch (`SL-42` gibi)

**Akış:** feature branch → develop → main

## Commit Standardı

[Conventional Commits](https://www.conventionalcommits.org/) kullanılır:

```
<type>(SL-XX): kısa açıklama

- değişiklik 1
- değişiklik 2
```

| Type | Ne zaman |
|------|----------|
| `feat` | Yeni özellik |
| `fix` | Hata düzeltme |
| `chore` | Yapılandırma, bağımlılık |
| `docs` | Sadece dokümantasyon |
| `refactor` | Davranış değişmeden yeniden yapılandırma |
| `test` | Test ekleme/düzenleme |

## Ortam Değişkenleri

`.env` Symfony için şablon olarak commit edilir. Gerçek değerleri `.env.local` içine yaz (`.gitignore`'da).

Docker servisleri için `.env.example` şablonunu kullan.

# OmniSync — Docker Secrets Setup

Docker file-based secrets allow sensitive values to be stored as files on the
host and mounted read-only into containers at `/run/secrets/<name>`, rather
than being embedded in environment variables or compose files.

## Required Secret Files

Create the following files before running the production stack.
Each file should contain **only the secret value** (no newline, no quotes).

```
secrets/
├── db_password.txt          ← PostgreSQL password
├── redis_password.txt       ← Redis password
├── jwt_secret.txt           ← JWT signing secret (min 32 chars)
├── tiktok_app_secret.txt    ← TikTok Partner App Secret
├── shopee_partner_key.txt   ← Shopee Partner Key
└── lazada_app_secret.txt    ← Lazada App Secret
```

## Quick Setup (Linux / macOS)

```bash
# Create secrets directory (never commit this to Git)
mkdir -p ./secrets

# Generate strong random secrets
openssl rand -base64 32 | tr -d '\n' > ./secrets/db_password.txt
openssl rand -base64 48 | tr -d '\n' > ./secrets/jwt_secret.txt
openssl rand -base64 32 | tr -d '\n' > ./secrets/redis_password.txt

# Fill marketplace secrets from your partner portals
echo -n "your-tiktok-app-secret"   > ./secrets/tiktok_app_secret.txt
echo -n "your-shopee-partner-key"  > ./secrets/shopee_partner_key.txt
echo -n "your-lazada-app-secret"   > ./secrets/lazada_app_secret.txt

# Restrict permissions
chmod 600 ./secrets/*.txt
```

## Quick Setup (Windows PowerShell)

```powershell
New-Item -ItemType Directory -Force -Path .\secrets

# Generate strong random secrets
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) | `
  Out-File -Encoding ascii -NoNewline .\secrets\db_password.txt

[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48)) | `
  Out-File -Encoding ascii -NoNewline .\secrets\jwt_secret.txt

[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32)) | `
  Out-File -Encoding ascii -NoNewline .\secrets\redis_password.txt

# Fill these manually from your partner portals
"your-tiktok-app-secret"  | Out-File -Encoding ascii -NoNewline .\secrets\tiktok_app_secret.txt
"your-shopee-partner-key" | Out-File -Encoding ascii -NoNewline .\secrets\shopee_partner_key.txt
"your-lazada-app-secret"  | Out-File -Encoding ascii -NoNewline .\secrets\lazada_app_secret.txt
```

## Starting the Production Stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## SSL Certificates

TLS certificates should be placed in `./certs/`:

```
certs/
├── fullchain.pem    ← Certificate + intermediate chain
└── privkey.pem      ← Private key (keep 600 permissions)
```

**Let's Encrypt (recommended):**
```bash
certbot certonly --standalone -d yourdomain.com
mkdir -p ./certs
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./certs/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   ./certs/
chmod 600 ./certs/privkey.pem
```

**Self-signed (staging only):**
```bash
mkdir -p ./certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ./certs/privkey.pem \
  -out ./certs/fullchain.pem \
  -subj "/CN=localhost"
```

## Security Notes

- The `./secrets/` and `./certs/` directories are listed in `.gitignore` — **never commit them**
- Rotate secrets periodically using `openssl rand` and restart the stack
- In a cloud environment, prefer native secret managers (AWS Secrets Manager, GCP Secret Manager) and inject via environment variables at runtime

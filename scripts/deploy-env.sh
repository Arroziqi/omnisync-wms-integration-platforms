#!/usr/bin/env bash
# ==============================================================================
# deploy-env.sh — Automated Environment Deployment & Smoke Testing Script
# ==============================================================================
# Usage:
#   ./deploy-env.sh staging
#   ./deploy-env.sh production
#
# Description:
#   This script automates host directory verification, secret checking, TLS bootstrapping,
#   Docker Compose deployments, database migrations, database seeding, and post-deploy
#   smoke testing and security validations.
# ==============================================================================

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Logging helper
# ──────────────────────────────────────────────────────────────────────────────
log() {
  echo -e "\033[1;34m[DEPLOYMENT]\033[0m $1"
}

success() {
  echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

warn() {
  echo -e "\033[1;33m[WARNING]\033[0m $1"
}

error() {
  echo -e "\033[1;31m[ERROR]\033[0m $1" >&2
}

# ──────────────────────────────────────────────────────────────────────────────
# Argument validation
# ──────────────────────────────────────────────────────────────────────────────
if [ $# -lt 1 ]; then
  error "Usage: $0 [staging|production]"
  exit 1
fi

ENV="${1,,}" # Convert to lowercase

if [ "$ENV" != "staging" ] && [ "$ENV" != "production" ]; then
  error "Invalid environment '$ENV'. Allowed: staging, production"
  exit 1
fi

log "Starting deployment sequence for target environment: \033[1;35m${ENV^^}\033[0m"

# ──────────────────────────────────────────────────────────────────────────────
# 1. Prerequisite Verification
# ──────────────────────────────────────────────────────────────────────────────
log "Checking host prerequisites..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
  error "Docker is not installed on this host! Aborting deployment."
  exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
  error "Docker Compose (v2) is not installed! Aborting deployment."
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 2. Secrets Management Audit
# ──────────────────────────────────────────────────────────────────────────────
log "Auditing secrets configuration..."

REQUIRED_SECRETS=(
  "db_password.txt"
  "redis_password.txt"
  "jwt_secret.txt"
  "tiktok_app_secret.txt"
  "shopee_partner_key.txt"
  "lazada_app_secret.txt"
)

MISSING_SECRETS=()
mkdir -p ./secrets

for secret in "${REQUIRED_SECRETS[@]}"; do
  if [ ! -f "./secrets/$secret" ]; then
    MISSING_SECRETS+=("$secret")
  fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
  if [ "$ENV" == "production" ]; then
    error "Production deployment aborted: Missing required file-based secrets: [${MISSING_SECRETS[*]}]"
    error "Please create these secret files inside ./secrets/ before deploying."
    exit 1
  else
    warn "Missing development/staging secrets: [${MISSING_SECRETS[*]}]."
    warn "Generating mock/development secrets in ./secrets/ for staging environment..."
    for secret in "${MISSING_SECRETS[@]}"; do
      case "$secret" in
        "db_password.txt"|"redis_password.txt")
          openssl rand -base64 24 | tr -d '\n' > "./secrets/$secret"
          ;;
        "jwt_secret.txt")
          openssl rand -base64 48 | tr -d '\n' > "./secrets/$secret"
          ;;
        *)
          echo -n "mock-secret-for-staging-only" > "./secrets/$secret"
          ;;
      esac
      chmod 600 "./secrets/$secret"
      success "Generated ./secrets/$secret"
    done
  fi
else
  success "All required Docker secrets audited successfully."
fi

# ──────────────────────────────────────────────────────────────────────────────
# 3. TLS Certificate Bootstrapping (for Nginx)
# ──────────────────────────────────────────────────────────────────────────────
log "Checking TLS certificates..."
mkdir -p ./certs

if [ ! -f "./certs/fullchain.pem" ] || [ ! -f "./certs/privkey.pem" ]; then
  if [ "$ENV" == "production" ]; then
    error "Missing production TLS certificates in ./certs/ (fullchain.pem and privkey.pem required)!"
    error "Ensure Let's Encrypt certificates are acquired and copied as described in deployment_guide.md."
    exit 1
  else
    warn "Staging TLS certificates not found. Bootstrapping self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout ./certs/privkey.pem \
      -out ./certs/fullchain.pem \
      -subj "/CN=localhost" \
      &> /dev/null
    chmod 600 ./certs/privkey.pem
    success "Self-signed SSL certificates created successfully for staging."
  fi
else
  success "Active TLS certificates validated."
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4. Compose Orchestration
# ──────────────────────────────────────────────────────────────────────────────
log "Orchestrating Docker containers..."

if [ "$ENV" == "production" ]; then
  # Production: Enforce production overrides (isolated ports, resource limits, secrets mounting)
  COMPOSE_COMMAND="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
else
  # Staging: Run standard orchestration suited for staging
  COMPOSE_COMMAND="docker compose -f docker-compose.yml"
fi

log "Executing build & up commands..."
$COMPOSE_COMMAND down --remove-orphans
$COMPOSE_COMMAND up -d --build

# Wait for containers to start and database to run healthchecks
log "Waiting for core services to report healthy..."
sleep 10

# ──────────────────────────────────────────────────────────────────────────────
# 5. Database Schema & Migration Execution
# ──────────────────────────────────────────────────────────────────────────────
log "Executing database migrations and seeding inside the 'api' container..."

if docker ps --filter "name=omnisync-api" --filter "status=running" | grep -q "omnisync-api"; then
  # Exec TypeORM migration run
  log "Running migrations..."
  if docker exec -t omnisync-api npx nx run api:migration:run; then
    success "Database migrations executed successfully."
  else
    error "Database migration run failed! Check container logs."
    exit 1
  fi

  # Exec seeding
  log "Seeding database..."
  if docker exec -t omnisync-api npx nx run api:seed; then
    success "Seed data populated successfully."
  else
    warn "Database seeding returned a non-zero exit code (might contain duplicate keys, skipping)."
  fi
else
  error "The NestJS API container ('omnisync-api') is not running. Unable to execute migrations."
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 6. Automated Production Smoke Testing
# ──────────────────────────────────────────────────────────────────────────────
log "Executing dynamic post-deployment smoke tests..."

HOST_URL="http://localhost"
HTTP_STATUS=0
ATTEMPT=1
MAX_ATTEMPTS=6

# Poll gateway health endpoint via Nginx port 80
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  log "Polling gateway health check [Attempt $ATTEMPT/$MAX_ATTEMPTS]..."
  HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 ${HOST_URL}/health || echo "000")
  
  if [ "$HTTP_STATUS" == "200" ]; then
    success "Gateways and services reported status: 200 OK!"
    break
  fi
  
  warn "Health check endpoint returned: $HTTP_STATUS. Retrying in 5 seconds..."
  sleep 5
  ATTEMPT=$((ATTEMPT+1))
done

if [ "$HTTP_STATUS" != "200" ]; then
  error "SMOKE TEST FAILED! System returned status code: $HTTP_STATUS"
  log "Fetching container logs for debugging..."
  docker logs --tail 30 omnisync-api || true
  exit 1
fi

# Poll deep readiness check
log "Polling deep database & cache readiness checks (/health/ready)..."
READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 ${HOST_URL}/api/v1/health/ready || echo "000")
if [ "$READY_STATUS" == "200" ]; then
  success "Database and Redis pools validated as ACTIVE and READY."
else
  error "Readiness probe failed with status code: $READY_STATUS. System is not fully integrated."
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# 7. Post-Deployment Security Audit
# ──────────────────────────────────────────────────────────────────────────────
log "Executing automated final security validation..."

# Check server headers for Nginx signature suppression (server_tokens off)
SERVER_HEADER=$(curl -s -I ${HOST_URL} | grep -Fi "Server:" || echo "Server: missing")
if echo "$SERVER_HEADER" | grep -q "nginx/"; then
  warn "Nginx signature is exposed: $SERVER_HEADER. We recommend disabling server_tokens."
else
  success "Nginx server signature suppressed correctly."
fi

# Verify port isolations for Production
if [ "$ENV" == "production" ]; then
  log "Verifying internal ports isolation for Database and Redis..."
  # PostgreSQL port 5432 should not be accessible from external hosts
  if nc -z -w3 localhost 5432 &>/dev/null; then
    error "SECURITY FLAW: PostgreSQL port 5432 is exposed on the host interface!"
    exit 1
  else
    success "PostgreSQL port is securely isolated."
  fi

  # Redis port 6379 should not be accessible from external hosts
  if nc -z -w3 localhost 6379 &>/dev/null; then
    error "SECURITY FLAW: Redis port 6379 is exposed on the host interface!"
    exit 1
  else
    success "Redis port is securely isolated."
  fi
fi

success "\033[1;32mEnvironment ${ENV^^} deployed and validated successfully!\033[0m"

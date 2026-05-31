#!/usr/bin/env bash
# ==============================================================================
# backup-db.sh — Automated PostgreSQL Database Backup Script
# ==============================================================================
# Usage:
#   ./backup-db.sh
# 
# Description:
#   This script performs a compressed, secure pg_dump of the active OmniSync 
#   PostgreSQL container, logs the results, and rotates old backups to maintain
#   a healthy disk usage profile (7 days of daily, 4 weeks of weekly backups).
# 
# Install:
#   1. Copy to VPS at /opt/omnisync/scripts/backup-db.sh
#   2. chmod +x /opt/omnisync/scripts/backup-db.sh
#   3. Configure cron job to run daily at 2 AM:
#        0 2 * * * /opt/omnisync/scripts/backup-db.sh >> /var/log/omnisync-backup.log 2>&1
# ==============================================================================

set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# Configuration & Paths
# ──────────────────────────────────────────────────────────────────────────────
BACKUP_DIR="/opt/omnisync/backups"
LOG_FILE="/var/log/omnisync-backup.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_BACKUP_FILE="${BACKUP_DIR}/omnisync_db_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="omnisync-postgres"

# Default PG parameters (fallbacks if not found in .env)
DB_USER="omnisync"
DB_NAME="omnisync_db"
ENV_FILE="/opt/omnisync/.env"

# Ensure logging works
touch "$LOG_FILE"
exec 3>&1 4>&2
exec 1>>"$LOG_FILE" 2>&1

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "▶ Starting automated database backup process..."

# Create backup directory if not exists
if [ ! -d "$BACKUP_DIR" ]; then
  log "Creating backup directory at ${BACKUP_DIR}..."
  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
fi

# Load database settings from host's .env file if available
if [ -f "$ENV_FILE" ]; then
  log "Loading configuration from ${ENV_FILE}..."
  # Source without comments
  set -a
  source <(grep -v '^#' "$ENV_FILE")
  set +a
  DB_USER="${POSTGRES_USER:-$DB_USER}"
  DB_NAME="${POSTGRES_DB:-$DB_NAME}"
fi

# Check if PostgreSQL container is running
if ! docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" | grep -q "${CONTAINER_NAME}"; then
  log "❌ ERROR: PostgreSQL container '${CONTAINER_NAME}' is not running! Aborting."
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# Perform PostgreSQL Dump
# ──────────────────────────────────────────────────────────────────────────────
log "Dumping database '${DB_NAME}' as user '${DB_USER}' from container '${CONTAINER_NAME}'..."

# We execute pg_dump inside the container and compress it on the fly
if docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$TEMP_BACKUP_FILE"; then
  BACKUP_SIZE=$(du -sh "$TEMP_BACKUP_FILE" | cut -f1)
  log "✅ Database dump completed successfully. File: ${TEMP_BACKUP_FILE} (Size: ${BACKUP_SIZE})"
else
  log "❌ ERROR: pg_dump execution failed! Check docker logs for '${CONTAINER_NAME}'."
  rm -f "$TEMP_BACKUP_FILE"
  exit 1
fi

# ──────────────────────────────────────────────────────────────────────────────
# Backup Retention & Rotation Policy
# ──────────────────────────────────────────────────────────────────────────────
log "Applying backup rotation policy..."

# Rotation Rules:
# 1. Keep all daily backups for the last 7 days.
# 2. Keep weekly backups (from Sundays) for the last 28 days (4 weeks).
# 3. Delete any other backups older than 7 days.

DAY_OF_WEEK=$(date +"%u") # 1 = Monday, 7 = Sunday
SUNDAY=7

# Move Sunday backups to a weekly naming format to protect them from daily purge
if [ "$DAY_OF_WEEK" -eq "$SUNDAY" ]; then
  WEEKLY_FILE="${BACKUP_DIR}/weekly_omnisync_db_${TIMESTAMP}.sql.gz"
  cp "$TEMP_BACKUP_FILE" "$WEEKLY_FILE"
  log "Sunday backup copied to weekly store: ${WEEKLY_FILE}"
fi

# Purge standard daily backups older than 7 days
log "Purging daily backups older than 7 days..."
find "$BACKUP_DIR" -name "omnisync_db_*.sql.gz" -type f -mtime +7 -delete

# Purge weekly backups older than 28 days
log "Purging weekly backups older than 28 days..."
find "$BACKUP_DIR" -name "weekly_omnisync_db_*.sql.gz" -type f -mtime +28 -delete

log "⏹ Database backup process completed."

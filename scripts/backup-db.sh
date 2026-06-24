#!/usr/bin/env bash
# ACMS — backup harian MySQL (host). Pasang di cron (lihat DEPLOYMENT.md).
# Kredensial via env: ACMS_DB_* atau ~/.my.cnf.
set -euo pipefail

BACKUP_DIR="${ACMS_BACKUP_DIR:-/var/backups/acms}"
DB_NAME="${ACMS_DB_NAME:-acms_db}"
DB_USER="${ACMS_DB_USER:-acms}"
DB_PASS="${ACMS_DB_PASS:-}"
DB_HOST="${ACMS_DB_HOST:-127.0.0.1}"
KEEP_DAYS="${ACMS_BACKUP_KEEP_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/acms_${STAMP}.sql.gz"

mysqldump --single-transaction --quick --no-tablespaces \
  --host="$DB_HOST" --user="$DB_USER" --password="$DB_PASS" "$DB_NAME" \
  | gzip > "$FILE"

# Hapus backup lebih lama dari KEEP_DAYS hari.
find "$BACKUP_DIR" -name 'acms_*.sql.gz' -mtime "+${KEEP_DAYS}" -delete

echo "Backup selesai: $FILE"

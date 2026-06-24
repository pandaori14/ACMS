#!/usr/bin/env bash
# ACMS — deploy/update ke server via container (git pull + build + migrate).
# Pakai: ./deploy.sh   (jalankan di root repo, di server).
# Menggantikan skrip native/PM2 lama — kini berbasis Podman/Docker container.
set -euo pipefail
cd "$(dirname "$0")"

# Pakai 'podman-compose' atau 'docker compose' sesuai yang tersedia.
if command -v podman-compose >/dev/null 2>&1; then
  COMPOSE="podman-compose"
  RUNTIME="podman"
elif podman compose version >/dev/null 2>&1; then
  COMPOSE="podman compose"
  RUNTIME="podman"
else
  COMPOSE="docker compose"
  RUNTIME="docker"
fi

echo "==> [1/4] Tarik kode terbaru dari GitHub"
git pull origin main

echo "==> [2/4] Build image & start container (runtime: $RUNTIME)"
$COMPOSE up -d --build

echo "==> [3/4] Migrasi DB + optimize cache"
$RUNTIME exec acms-backend php artisan migrate --force
$RUNTIME exec acms-backend php artisan config:cache
$RUNTIME exec acms-backend php artisan route:cache
$RUNTIME exec acms-backend php artisan view:cache
$RUNTIME exec acms-backend php artisan storage:link || true

echo "==> [4/4] Selesai. Status container:"
$RUNTIME ps --filter "name=acms-"
echo "Selesai. ACMS aktif di /acms."

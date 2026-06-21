#!/bin/bash
# ==============================================================================
# ACMS Automated Deployment Script
# ==============================================================================
# Usage: ./deploy.sh
# This script automates pulling code, building frontend, and migrating backend.
# Run this from the root directory of the project.
# ==============================================================================

# Stop execution if any command fails
set -e

# Configuration
PROJECT_DIR="$(pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
BRANCH="main"

echo "==========================================================="
echo "🚀 Starting ACMS Deployment on $(date)"
echo "==========================================================="

echo "1️⃣  Pulling latest changes from Git (Branch: $BRANCH)..."
git checkout $BRANCH
git pull origin $BRANCH

echo "==========================================================="
echo "2️⃣  Deploying Backend (Laravel)..."
echo "==========================================================="
cd $BACKEND_DIR

echo "Installing PHP dependencies..."
# Use --no-dev for production
composer install --optimize-autoloader --no-interaction --no-dev

echo "Clearing and caching Laravel configurations..."
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "Running Database Migrations..."
# Remove --force if you want manual confirmation
php artisan migrate --force

# Restart PHP-FPM if necessary (requires sudo, might be configured in visudo)
# echo "Restarting PHP-FPM..."
# sudo systemctl reload php8.4-fpm

echo "==========================================================="
echo "3️⃣  Deploying Frontend (Next.js)..."
echo "==========================================================="
cd $FRONTEND_DIR

echo "Installing Node dependencies..."
npm ci

echo "Building Next.js for production..."
npm run build

echo "==========================================================="
echo "4️⃣  Restarting Services..."
echo "==========================================================="
cd $PROJECT_DIR

echo "Restarting PM2 process for Frontend..."
# Assuming PM2 process is named 'acms-frontend' via ecosystem.config.js
pm2 reload acms-frontend || pm2 start ecosystem.config.js

echo "==========================================================="
echo "✅ Deployment completed successfully on $(date)!"
echo "==========================================================="

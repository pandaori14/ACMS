# syntax=docker/dockerfile:1
# ACMS Backend (Laravel 12) — image multi-target untuk Podman/Docker.
#   target `dev`  : hot-reload via `php artisan serve` (source di-bind-mount).
#   target `prod` : nginx + php-fpm + supervisor (siap produksi).

# ---------- base: PHP 8.2 + ekstensi yang dibutuhkan ACMS ----------
FROM php:8.2-fpm-bookworm AS base

# Ekstensi: pdo_mysql (DB), gd (DomPDF/Excel), zip/exif (Excel/upload),
# bcmath/intl (perhitungan & lokal), pcntl (queue), opcache (performa).
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libpng-dev libjpeg-dev libfreetype6-dev \
        libonig-dev libicu-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring bcmath gd zip exif pcntl intl opcache \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Composer (dari image resmi)
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
ENV COMPOSER_ALLOW_SUPERUSER=1

# ---------- dev: untuk lingkungan pengembangan (bind-mount source) ----------
FROM base AS dev
# Source di-bind-mount saat runtime. vendor disimpan di volume persisten:
# install otomatis bila belum ada, lalu jalankan dev server.
EXPOSE 8000
CMD ["sh", "-c", "[ -f vendor/autoload.php ] || composer install --no-interaction --prefer-dist; php artisan serve --host=0.0.0.0 --port=8000"]

# ---------- prod: nginx + php-fpm + supervisor ----------
FROM base AS prod

RUN apt-get update && apt-get install -y --no-install-recommends nginx supervisor \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Dependency PHP dulu (cache layer), lalu kode aplikasi.
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
RUN composer dump-autoload --optimize --no-dev \
    && cp docker/php-opcache.ini "$PHP_INI_DIR/conf.d/zz-opcache.ini" \
    && chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/supervisord.conf /etc/supervisor/conf.d/acms.conf

EXPOSE 80
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/acms.conf", "-n"]

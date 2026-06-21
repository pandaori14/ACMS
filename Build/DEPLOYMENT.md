# ACMS Production Deployment Guide (Subfolder Architecture)

Panduan ini berisi instruksi khusus untuk meng-*hosting* aplikasi ACMS ke dalam *server* berbasis Nginx (seperti **alumnilink** atau **mmpiv2**) menggunakan pendekatan **Subfolder Isolation**. 

Pendekatan ini dirancang 100% aman agar instalasi ACMS di rute `apps.kedok.ac.id/acms` tidak menimpa, mengubah, atau merusak aplikasi *root* maupun aplikasi-aplikasi tetangga lainnya (misal: `/app1`, `/app2`).

---

## 1. Arsitektur Isolasi
- **URL Frontend**: `https://apps.kedok.ac.id/acms`
- **URL Backend API**: `https://apps.kedok.ac.id/acms-api`
- **Frontend Port**: PM2 berjalan di `3015` (untuk mencegah bentrok dengan aplikasi Node.js tetangga).

---

## 2. Pemasangan Konfigurasi Nginx
Anda TIDAK PERLU menghapus atau merombak blok konfigurasi situs Anda saat ini. Cukup buka konfigurasi *server* Anda (misal `sudo nano /etc/nginx/sites-available/apps.kedok.ac.id`), lalu sisipkan **dua blok khusus ACMS** ini di dalamnya:

```nginx
server {
    listen 80;
    server_name apps.kedok.ac.id;

    # ... Blok lokasi aplikasi lain (app1, app2) ada di sini ...

    # [1] BLOK ACMS BACKEND (/acms-api)
    location ^~ /acms-api {
        # GANTI PATH INI ke tempat Anda menaruh folder ACMS!
        alias /var/www/acms/backend/public;
        try_files $uri $uri/ @acms_backend;
        
        location ~ /\.env { deny all; }
        
        location ~ \.php$ {
            fastcgi_split_path_info ^(/acms-api)(/.*)$;
            # Sesuaikan dengan versi PHP-FPM Anda (misal 8.2, 8.3, 8.4)
            fastcgi_pass unix:/var/run/php/php8.4-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $request_filename;
            include fastcgi_params;
        }
    }

    location @acms_backend {
        rewrite /acms-api/(.*)$ /acms-api/index.php?/$1 last;
    }

    # [2] BLOK ACMS FRONTEND (/acms)
    location ^~ /acms {
        # PM2 berjalan di port 3015
        proxy_pass http://127.0.0.1:3015;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Lalu muat ulang Nginx: `sudo systemctl reload nginx`.

---

## 3. Konfigurasi Backend (Laravel)
Saat melakukan instalasi *backend* (`cd backend`), salin `.env.example` ke `.env` dan atur:
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://apps.kedok.ac.id/acms-api

# Tambahkan baris penyesuaian session domain & Sanctum stateful
SANCTUM_STATEFUL_DOMAINS=apps.kedok.ac.id
SESSION_DOMAIN=.kedok.ac.id
```
Jalankan dependensi:
```bash
composer install --optimize-autoloader --no-dev
php artisan key:generate
php artisan migrate --force
```

---

## 4. Konfigurasi Frontend (Next.js)
Saat melakukan instalasi *frontend* (`cd frontend`), salin `.env.example` ke `.env`:
```env
NEXT_PUBLIC_API_URL=https://apps.kedok.ac.id/acms-api
```
Karena ini mode *subfolder*, aplikasi sudah dikonfigurasi melalui `next.config.ts` untuk menggunakan `basePath: '/acms'`. Jadi Anda tinggal melakukan *build*:
```bash
npm ci
npm run build
```

---

## 5. Menyalakan Proses PM2
Dari folder utama proyek, jalankan:
```bash
pm2 start ecosystem.config.js
pm2 save
```
Aplikasi frontend akan secara aman berlabuh di port `3015` menggunakan klaster Node.js, sepenuhnya terisolasi dari *port* 3000 *default*.

## Selesai!
Buka URL `https://apps.kedok.ac.id/acms` di *browser*. Anda akan langsung melihat aplikasi ACMS beroperasi penuh dengan backend tersambung ke rute `/acms-api`. Jika Anda menggunakan `deploy.sh` di kemudian hari, skrip itu sudah cukup cerdas untuk tidak merusak konfigurasi isolasi ini.

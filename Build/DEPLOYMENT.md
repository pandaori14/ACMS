# DEPLOYMENT — ACMS via Podman (server kampus UMS)

Panduan deploy ACMS sebagai **container Podman** di server Ubuntu bersama (subpath `/acms`
pada domain yang juga dipakai aplikasi lain), terisolasi dari aplikasi lain.

> Menggantikan pendekatan native/PM2 lama. Kini: Next.js & Laravel jalan di container
> (port hanya di `127.0.0.1`), **Nginx host** mem-proxy `/acms` ke container, **MySQL host**
> dipakai bersama (DB & user khusus ACMS). Beda runtime (PHP/Node) tak ganggu aplikasi lain.

---

## 1. Arsitektur

```
Browser → https://domain.ums.ac.id/acms
            │
   Nginx HOST (sudah ada, juga melayani /star dll)
            ├── /acms/api  ─→ 127.0.0.1:8001  (container acms-backend: nginx+php-fpm → Laravel)
            ├── /acms/sanctum ─→ 127.0.0.1:8001
            └── /acms      ─→ 127.0.0.1:3001  (container acms-frontend: Next.js, basePath /acms)
                                   │
                container acms-queue & acms-scheduler (image backend, perintah beda)
                                   │
                        MySQL HOST (host.containers.internal:3306)
```

Container: `acms-backend`, `acms-frontend`, `acms-queue`, `acms-scheduler`.

---

## 2. Prasyarat server (sekali saja)

```bash
sudo apt update
sudo apt install -y podman git
sudo apt install -y podman-compose   # atau: pip3 install podman-compose
podman --version && podman-compose --version
```
MySQL & Nginx host diasumsikan **sudah terpasang** (dipakai aplikasi lain).

---

## 3. Siapkan database MySQL (host)

```sql
CREATE DATABASE acms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- '%' agar bisa diakses dari container (lihat catatan jaringan di §8).
CREATE USER 'acms'@'%' IDENTIFIED BY 'GANTI_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON acms_db.* TO 'acms'@'%';
FLUSH PRIVILEGES;
```

---

## 4. Clone & konfigurasi

```bash
cd /opt
git clone https://github.com/pandaori14/ACMS.git acms
cd acms

cp backend/.env.production.example backend/.env
nano backend/.env      # APP_URL, DB_PASSWORD, SESSION_DOMAIN, SANCTUM_STATEFUL_DOMAINS, MAIL_*, dll

# URL publik untuk build frontend (di-bake ke bundle klien):
export ACMS_PUBLIC_URL="https://domain.ums.ac.id/acms"
```
APP_KEY: setelah container hidup, `podman exec acms-backend php artisan key:generate` lalu salin
ke `backend/.env` (atau set manual), kemudian deploy ulang agar config:cache memuatnya.

---

## 5. Build & jalankan

```bash
chmod +x deploy.sh scripts/backup-db.sh
./deploy.sh

# HANYA saat pertama — seeder PRODUKSI (esensial saja, TANPA data dummy & TANPA akun default).
# Pastikan ADMIN_EMAIL & ADMIN_PASSWORD sudah diisi di backend/.env lebih dulu.
podman exec acms-backend php artisan db:seed --class=ProductionSeeder --force

podman ps   # 4 container acms-* harus Up
```

> ⚠️ JANGAN pakai `migrate --seed` di produksi — itu memuat data dummy (mahasiswa/RS palsu)
> dan 8 akun berpassword `password`. Selalu pakai `ProductionSeeder`.
> Setelah login pertama, ganti password Super Admin lewat UI lalu kosongkan `ADMIN_PASSWORD` di `.env`.

---

## 6. Konfigurasi Nginx HOST (subpath /acms)

Sisipkan ke server block domain yang sudah ada, **di atas** `location /` aplikasi lain:

```nginx
# --- ACMS (subpath /acms) ---
location ^~ /acms/api/ {
    proxy_pass         http://127.0.0.1:8001/api/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    client_max_body_size 25M;
}
location ^~ /acms/sanctum/ {
    proxy_pass         http://127.0.0.1:8001/sanctum/;
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
location ^~ /acms {
    proxy_pass         http://127.0.0.1:3001;
    proxy_set_header   Host $host;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
}
```
`sudo nginx -t && sudo systemctl reload nginx`. SSL mengikuti sertifikat domain yang sudah ada.

> `.env`: `APP_URL=https://domain.ums.ac.id/acms`, `SESSION_DOMAIN=domain.ums.ac.id`,
> `SANCTUM_STATEFUL_DOMAINS=domain.ums.ac.id`, `SESSION_SECURE_COOKIE=true`.
> Same-origin → tanpa pusing CORS.

---

## 7. Backup harian (cron)

```bash
sudo crontab -e
0 1 * * * ACMS_DB_PASS='GANTI_PASSWORD_KUAT' /opt/acms/scripts/backup-db.sh >> /var/log/acms-backup.log 2>&1
```
Uji restore berkala: `gunzip < /var/backups/acms/acms_XXXX.sql.gz | mysql -u acms -p acms_db`.

---

## 8. Catatan jaringan: container → MySQL host

Container mengakses MySQL host via `host.containers.internal` (sudah di-set di compose). Agar diterima:
- Set `bind-address = 0.0.0.0` di `/etc/mysql/mysql.conf.d/mysqld.cnf`, **lalu batasi dengan firewall**
  (`ufw`) agar port 3306 TIDAK terbuka ke publik — hanya lokal/podman.
- User `acms'@'%'` (atau batasi ke subnet podman, mis. `10.88.0.0/16`).
- Alternatif paling sederhana: jalankan dengan `--network host` lalu `DB_HOST=127.0.0.1`
  (kurang terisolasi jaringan, tapi tanpa ubah bind-address).

---

## 9. Update rutin (fitur baru → server)

Alur: kerja di PC → `git push` ke `main` → di server jalankan `./deploy.sh`.

```bash
cd /opt/acms && ./deploy.sh
```
Migrasi & cache otomatis; worker queue/scheduler ikut ter-update.

### Rollback cepat
```bash
git checkout <tag-stabil>   # mis. v1.0
./deploy.sh
```
Disarankan tag tiap rilis: `git tag v1.0 && git push --tags`.

---

## 10. Development pakai container (PC pribadi & kantor identik)

```bash
podman-compose -f compose.dev.yml up -d --build
podman-compose -f compose.dev.yml exec backend composer install
podman-compose -f compose.dev.yml exec backend php artisan key:generate
podman-compose -f compose.dev.yml exec backend php artisan migrate --seed
# Akses: http://localhost:3000/acms   (backend: http://localhost:8000)
```
`backend/.env` mode container-dev: `DB_HOST=mysql`, `DB_PORT=3306`, `DB_USERNAME=root`, `DB_PASSWORD=root`.
Source di-bind-mount → edit langsung ter-refresh. (Tetap boleh pakai XAMPP bila lebih suka.)

---

## 11. Troubleshooting

| Gejala | Cek |
|--------|-----|
| 502 di `/acms` | `podman ps` · `podman logs acms-frontend` |
| 500 / error DB | `podman logs acms-backend` · koneksi MySQL host (§8) · `APP_KEY` terisi? |
| Login gagal (419/CSRF) | `SESSION_DOMAIN` & `SANCTUM_STATEFUL_DOMAINS` = domain · `SESSION_SECURE_COOKIE=true` |
| Aset/JS 404 | `ACMS_PUBLIC_URL` saat build = `https://domain.ums.ac.id/acms` |
| Email tak terkirim | container `acms-queue` jalan? · kredensial `MAIL_*` |
| Perubahan tak muncul | rebuild: `podman-compose up -d --build` (NEXT_PUBLIC di-bake saat build) |

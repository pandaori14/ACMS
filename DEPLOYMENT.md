# ACMS Deployment Guide

This document outlines how to deploy the Academic Clinical Management System (ACMS) to a production environment. 

ACMS consists of two parts:
1. **Laravel Backend** (API & Database)
2. **Next.js Frontend** (React Application)

## Prerequisites
- **PHP** >= 8.2 (with required extensions: mbstring, xml, curl, zip, pdo, etc.)
- **Composer**
- **Node.js** >= 18.17 (Node 20+ recommended)
- **PM2** (for running the Node.js frontend process in the background)
- **Nginx** or **Apache** (as a reverse proxy)

---

## 1. Backend Deployment (Laravel)

1. **Clone/Copy** the backend code to your production server directory (e.g., `/var/www/acms/backend`).
2. Run `composer install --optimize-autoloader --no-dev`.
3. Copy `.env.example` to `.env` and update your production configurations (Database, App URL, etc.).
4. Generate the app key: `php artisan key:generate`.
5. Run migrations: `php artisan migrate --force`.
6. Run database seeders (if necessary): `php artisan db:seed --force`.
7. Cache config and routes for performance:
   ```bash
   php artisan config:cache
   php artisan route:cache
   php artisan view:cache
   ```
8. Set proper permissions for the `storage` and `bootstrap/cache` directories:
   ```bash
   chmod -R 775 storage bootstrap/cache
   chown -R www-data:www-data storage bootstrap/cache
   ```

---

## 2. Frontend Deployment (Next.js)

The frontend is configured to run under a sub-path (`/acms`). 

1. **Clone/Copy** the frontend code to your server (e.g., `/var/www/acms/frontend`).
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```
3. Ensure the `.env.local` or `.env.production` contains the correct API endpoint pointing to your deployed backend.
   ```env
   NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
   ```
4. Build the application:
   ```bash
   npm run build
   ```
5. Start the application using PM2 to keep it alive in the background:
   ```bash
   pm2 start npm --name "acms-frontend" -- start
   ```
   *The Next.js app will usually start on `http://localhost:3000`.*

---

## 3. Web Server Configuration

To serve both the backend and frontend on the same domain, you need a reverse proxy. 

### A. Nginx Configuration

Create an Nginx server block (see `nginx.example.conf` for the full file):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend Reverse Proxy (Sub-path)
    location /acms {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API configuration (Optional if serving API from the same domain)
    # location /api { ... }
}
```

### B. Apache Configuration (XAMPP / cPanel)

If you are deploying using Apache, enable `mod_proxy` and `mod_proxy_http` and configure your VirtualHost:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com

    # Proxy requests for /acms to the Next.js server
    ProxyPreserveHost On
    ProxyPass /acms http://localhost:3000/acms
    ProxyPassReverse /acms http://localhost:3000/acms
</VirtualHost>
```

---

## 4. Final Verification
- Access `https://yourdomain.com/acms` and ensure the interface loads.
- Log in and verify that API requests (`/api/v1/...`) are working and the JWT token is being set successfully.

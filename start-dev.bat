@echo off
title ACMS - Dev Servers
color 0B

echo.
echo  ===================================================
echo     ACMS - Academic Clinical Management System
echo     Starting Development Servers...
echo  ===================================================
echo.

:: -- Konfigurasi Path --
set PHP_PATH=D:\xampp\php\php.exe
set BACKEND_DIR=%~dp0backend
set FRONTEND_DIR=%~dp0frontend

:: -- Cek PHP --
if not exist "%PHP_PATH%" (
    echo  [ERROR] PHP tidak ditemukan di %PHP_PATH%
    echo          Sesuaikan variabel PHP_PATH di file ini.
    pause
    exit /b 1
)

:: -- Cek Node / npm --
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js tidak ditemukan di PATH.
    echo          Install Node.js 18+ lalu coba lagi.
    pause
    exit /b 1
)

:: -- Pastikan XAMPP MySQL berjalan --
echo  [INFO]  Pastikan XAMPP MySQL sudah berjalan (database: acms_db)
echo.

:: -- Start Backend (Laravel) --
echo  [1/2]  Starting Backend - Laravel (port 8000)...
start "ACMS Backend" cmd /k "cd /d %BACKEND_DIR% && %PHP_PATH% artisan serve"
timeout /t 2 /nobreak >nul

:: -- Start Frontend (Next.js) --
echo  [2/2]  Starting Frontend - Next.js (port 3000)...
start "ACMS Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"
timeout /t 3 /nobreak >nul

:: -- Selesai --
echo.
echo  ===================================================
echo     Kedua server sudah berjalan!
echo.
echo     Backend  : http://localhost:8000
echo     Frontend : http://localhost:3000/acms
echo.
echo     Tutup jendela CMD masing-masing untuk stop.
echo  ===================================================
echo.
timeout /t 5

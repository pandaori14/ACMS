module.exports = {
  apps: [
    {
      name: "acms-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "start",
      instances: "max", // Or a specific number like 2, 4 depending on server CPU cores
      exec_mode: "cluster", // Enables clustered mode for zero-downtime reloads
      env: {
        NODE_ENV: "production",
        PORT: 3015,
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "../logs/pm2-frontend-error.log",
      out_file: "../logs/pm2-frontend-out.log",
      merge_logs: true,
      time: true,
    },
    // Note: Laravel backend typically runs via PHP-FPM, not PM2. 
    // However, if you use Laravel Octane or WebSockets (Reverb), you would add them here.
    // Example for Laravel Reverb (WebSockets) if used in the future:
    /*
    {
      name: "acms-reverb",
      cwd: "./backend",
      script: "php",
      args: "artisan reverb:start",
      instances: 1,
      exec_mode: "fork",
      error_file: "../logs/pm2-reverb-error.log",
      out_file: "../logs/pm2-reverb-out.log",
    }
    */
  ],
};

module.exports = {
  apps: [
    {
      name: "fuse-webhooks-bot",
      script: "npm",
      args: "run start",
      cron_restart: "0/20 * * * *" // Restart every hour.
    }
  ]
};

module.exports = {
  apps: [
    {
      name: 'arc-indexer',
      script: 'npx',
      args: 'ts-node scripts/indexer.ts',
      cwd: '/home/marcos/Projetos/arc-gallery',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/indexer-error.log',
      out_file: './logs/indexer-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

// eslint-disable-next-line no-undef
module.exports = {
  apps: [
    {
      name: 'auth-service',
      script: 'dist/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};

const { createApp, startReminderScheduler } = require('./app');

const PORT = process.env.PORT || 3000;
const app = createApp();

function startServer(port = PORT) {
  const server = app.listen(port, () => {
    console.log(`Server running: http://localhost:${port}`);
  });

  const reminderInterval = startReminderScheduler();

  server.on('close', () => {
    if (reminderInterval) clearInterval(reminderInterval);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} already in use. Kill the process using it or set PORT env var.`);
      process.exit(1);
    }
    console.error('Server error', err);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
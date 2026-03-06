const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { init } = require('./db/init');
const reminderService = require('./services/reminderService');
const apiContractMiddleware = require('./middleware/apiContract');
const { createAuthMiddleware } = require('./middleware/authz');

function getCorsOptions() {
  const raw = process.env.CORS_ORIGIN || '';
  const allowedOrigins = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length) {
        return callback(null, localhostPattern.test(origin));
      }
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, allowedOrigins.includes(origin));
    }
  };
}

function createApp() {
  init();

  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors(getCorsOptions()));
  app.use(morgan('dev'));
  app.use(express.json());
  app.use(apiContractMiddleware);
  app.use('/api', createAuthMiddleware());

  app.use(express.static(path.join(__dirname, 'public')));

  app.use('/api/clients', require('./routes/clients'));
  app.use('/api/appointments', require('./routes/appointments'));
  app.use('/api/materials', require('./routes/materials'));
  app.use('/api/inventory', require('./routes/inventory'));
  app.use('/api/transactions', require('./routes/transactions'));
  app.use('/api/summary', require('./routes/summary'));
  app.use('/api/budgets', require('./routes/budgets'));
  app.use('/api/receivables', require('./routes/receivables'));
  app.use('/api/receipts', require('./routes/receipts'));
  app.use('/api/reminders', require('./routes/reminders'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/service-orders', require('./routes/serviceOrders'));

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.get('/agenda', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'agenda.html'));
  });

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  return app;
}

function runAutoReminders() {
  reminderService.generatePendingReminders((err, result) => {
    if (err) {
      console.error('Erro ao gerar lembretes automaticamente:', err);
    } else {
      console.log('Lembretes automáticos gerados:', result);
    }
  });
}

function startReminderScheduler() {
  runAutoReminders();
  return setInterval(runAutoReminders, 24 * 60 * 60 * 1000);
}

module.exports = {
  createApp,
  startReminderScheduler
};

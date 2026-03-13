'use strict';

require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const { charge, confirm3ds } = require('./controllers/payment.controller');
const { injectClientIp }     = require('./middleware/validate-ip.middleware');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin:      process.env.ALLOWED_ORIGIN || 'http://localhost:4200',
  methods:     ['GET', 'POST'],
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.post('/api/payments/charge',      injectClientIp, charge);
app.post('/api/payments/3ds-confirm', confirm3ds);

app.use((err, _req, res, _next) => {
  console.error('[Unhandled]', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  const env = process.env.NODE_ENV || 'development';
  console.log(`✅ Backend PLUX corriendo en http://localhost:${PORT} [${env}]`);
});

module.exports = app;

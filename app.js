require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Prevent crashes from unhandled promise rejections and exceptions
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason?.message || reason);
});

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS headers
const allowedOrigins = [
  `http://localhost:${PORT}`,
  `http://192.168.0.100:${PORT}`
];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts. Please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: 'Too many requests. Please try again later.' }
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiters
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/', apiLimiter);

// Routes
app.use('/', require('./routes/loginRoute'));
app.use('/', require('./routes/registerRoute'));
app.use('/', require('./routes/profileRoute'));
app.use('/', require('./routes/adminRoute'));
app.use('/', require('./routes/taskRoute'));
app.use('/', require('./routes/widgetRoute'));
app.use('/', require('./routes/speedtestRoute'));
app.use('/', require('./routes/network-security'));
app.use('/', require('./routes/versionRoute'));
app.use('/', require('./routes/snarkRoute'));
app.use('/', require('./routes/dashboardRoute'));
app.use('/', require('./routes/projectRoute'));

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  res.status(err.status || 500).json({ 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;

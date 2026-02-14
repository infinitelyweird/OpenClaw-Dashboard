const express = require('express');
const app = express();
const path = require('path');
const registerRoute = require('./routes/registerRoute');
const loginRoute = require('./routes/loginRoute');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use(registerRoute);
app.use(loginRoute);

// Default to login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

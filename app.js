const express = require('express');
const app = express();
const path = require('path');
const registerRoute = require('./routes/registerRoute');
const loginRoute = require('./routes/loginRoute');
const adminRoute = require('./routes/adminRoute');
const profileRoute = require('./routes/profileRoute');
const widgetRoute = require('./routes/widgetRoute');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use(registerRoute);
app.use(loginRoute);
app.use(adminRoute);
app.use(profileRoute);
app.use(widgetRoute);

// Default to login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

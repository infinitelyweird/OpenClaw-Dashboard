const express = require('express');
const router = express.Router();

// Network Security main route
router.get('/', (req, res) => {
  res.send('Network Security Section');
});

module.exports = router;
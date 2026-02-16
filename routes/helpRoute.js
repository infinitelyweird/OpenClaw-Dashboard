const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Serve static help documentation files
const HELP_DIR = path.join(__dirname, '../public/help');

router.get('/api-docs', (req, res) => {
  const filePath = path.join(HELP_DIR, 'api-docs.md');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading API documentation.');
    }
    res.type('text/markdown').send(data);
  });
});

router.get('/features', (req, res) => {
  const filePath = path.join(HELP_DIR, 'features.md');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading Features documentation.');
    }
    res.type('text/markdown').send(data);
  });
});

router.get('/use-cases', (req, res) => {
  const filePath = path.join(HELP_DIR, 'use-cases.md');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading Use Cases documentation.');
    }
    res.type('text/markdown').send(data);
  });
});

// Serve Swagger JSON
router.get('/swagger.json', (req, res) => {
  const filePath = path.join(HELP_DIR, 'swagger.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading Swagger JSON.');
    }
    res.json(JSON.parse(data));
  });
});

module.exports = router;
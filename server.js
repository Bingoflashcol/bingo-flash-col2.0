const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render/Heroku-like platforms
app.set('trust proxy', 1);

// Serve static files from project root
app.use(express.static(__dirname, {
  extensions: ['html'],
  setHeaders(res) {
    // Basic security headers (lightweight)
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Fallback for direct navigation to unknown routes (serve index)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Bingo Flash Tradicional running on port ${PORT}`);
});

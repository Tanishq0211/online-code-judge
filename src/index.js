// src/index.js
require('dotenv').config();          // Load .env into process.env
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// ---- Middleware -------------------------------------------------
app.use(helmet());                   // Security headers
app.use(cors());                     // Enable CORS (adjust origins later if needed)
app.use(express.json());             // Parse JSON bodies
app.use(morgan('dev'));              // Log requests to console

// ---- Simple health check ----------------------------------------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Start the server -------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

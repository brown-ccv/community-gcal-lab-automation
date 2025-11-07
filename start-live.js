#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Only set DEMO_MODE if it's not already set via command line or .env
if (!process.env.DEMO_MODE) {
  process.env.DEMO_MODE = 'false';
}

import('./src/server.js');

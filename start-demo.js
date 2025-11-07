#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

process.env.DEMO_MODE = 'true';
import('./src/server.js');

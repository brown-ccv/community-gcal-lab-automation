import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import fs from 'fs';
import multer from 'multer';
import dotenv from 'dotenv';
import { createEvents, deleteEvents, deleteAllDemoEvents, createEventsFromCSV, deleteRecentEvents } from './calendar.js';
import { parseCSVFromBuffer, getEventSummary } from './csvParser.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Configuration
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
// Check for credentials in Render secret files location first, then local
const CREDENTIALS_PATH = fs.existsSync('/etc/secrets/credentials.json') 
  ? '/etc/secrets/credentials.json'
  : path.join(__dirname, '..', 'credentials.json');
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:3000/oauth2callback';

console.log('Using credentials from:', CREDENTIALS_PATH);
console.log('Demo mode:', DEMO_MODE ? 'ENABLED (no real API calls)' : 'DISABLED (real calendar events)');

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// OAuth2 client setup
let oAuth2Client = null;

function getOAuth2Client() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('credentials.json not found. Please add it to the project root.');
  }
  
  try {
    const fileContent = fs.readFileSync(CREDENTIALS_PATH, 'utf8');
    console.log('Credentials file length:', fileContent.length);
    console.log('First 50 chars:', fileContent.substring(0, 50));
    
    const credentials = JSON.parse(fileContent.trim());
    const { client_secret, client_id } = credentials.installed || credentials.web;
    
    if (!client_id || !client_secret) {
      throw new Error('Invalid credentials.json format: missing client_id or client_secret');
    }
    
    return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
  } catch (error) {
    console.error('Error reading credentials.json:', error);
    throw new Error(`Failed to parse credentials.json: ${error.message}`);
  }
}

function isAuthorized() {
  return fs.existsSync(TOKEN_PATH);
}

function getAuthorizedClient() {
  const client = getOAuth2Client();
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  client.setCredentials(token);
  return client;
}

// Routes

// API endpoint to check demo mode
app.get('/api/demo-mode', (req, res) => {
  res.json({ demoMode: DEMO_MODE });
});

// Home page - main form
app.get('/', (req, res) => {
  // Check if credentials.json exists (for calendar API, not user auth)
  if (!DEMO_MODE && !fs.existsSync(CREDENTIALS_PATH)) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'setup-required.html'));
  }
  
  // Check calendar API authorization (not user auth)
  if (!DEMO_MODE && !isAuthorized()) {
    return res.redirect('/authorize');
  }
  
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Authorization flow
app.get('/authorize', (req, res) => {
  // Check if credentials.json exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    return res.sendFile(path.join(__dirname, '..', 'public', 'setup-required.html'));
  }
  
  try {
    const client = getOAuth2Client();
    const authUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    res.redirect(authUrl);
  } catch (error) {
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <link rel="stylesheet" href="/styles.css">
        <style>
          .error-container { max-width: 600px; margin: 40px auto; padding: 20px; }
          .error { background: #fee; border: 2px solid #fcc; padding: 20px; border-radius: 8px; }
          h1 { color: #c00; }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error">
            <h1>⚠️ Authorization Error</h1>
            <p><strong>Error:</strong> ${error.message}</p>
            <p>Please check the setup guide in <code>docs/SETUP_GUIDE.md</code> for troubleshooting steps.</p>
            <p style="margin-top: 20px;">
              <a href="/" style="color: var(--primary-color);">← Back to home</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// OAuth callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  
  if (!code) {
    return res.status(400).send('No authorization code received.');
  }
  
  try {
    const client = getOAuth2Client();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);
    
    // Save token
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    
    res.redirect('/?authorized=true');
  } catch (error) {
    console.error('Error retrieving access token:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authorization Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .error { background: #fee; border: 1px solid #fcc; padding: 20px; border-radius: 8px; }
          h1 { color: #c00; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Authorization Failed</h1>
          <p>${error.message}</p>
          <p><a href="/authorize">Try again</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

// Create events endpoint
app.post('/create-events', async (req, res) => {
  if (!DEMO_MODE && !isAuthorized()) {
    return res.redirect('/authorize');
  }
  
  const { baseDate, title, time, attendeeEmail, demoMode } = req.body;
  
  // Validation
  if (!baseDate || !title || !attendeeEmail) {
    return res.status(400).json({ error: 'Base date, title, and participant email are required.' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(attendeeEmail)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }
  
  try {
    const auth = getAuthorizedClient();
    const results = await createEvents(auth, {
      baseDate,
      title,
      time: time || '09:00',
      attendeeEmail: attendeeEmail,
      calendarId: 'primary',
      dryRun: false,
      demoMode: demoMode === true || demoMode === 'true',
    });
    
    res.json({ success: true, results, demoMode: demoMode === true || demoMode === 'true' });
  } catch (error) {
    console.error('Error creating events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete events endpoint
app.post('/delete-events', async (req, res) => {
  if (!DEMO_MODE && !isAuthorized()) {
    return res.redirect('/authorize');
  }
  
  const { baseDate, title, attendeeEmail } = req.body;
  
  if (!baseDate || !title || !attendeeEmail) {
    return res.status(400).json({ error: 'Base date, title, and attendee email are required.' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(attendeeEmail)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }
  
  try {
    const auth = getAuthorizedClient();
    const results = await deleteEvents(auth, {
      baseDate,
      title,
      attendeeEmail,
      calendarId: 'primary',
    });
    
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error deleting events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Clear all demo events endpoint
app.post('/clear-demo-events', async (req, res) => {
  if (!DEMO_MODE && !isAuthorized()) {
    return res.redirect('/authorize');
  }
  
  try {
    const auth = getAuthorizedClient();
    const results = await deleteAllDemoEvents(auth, {
      calendarId: 'primary',
    });
    
    res.json({ 
      success: true, 
      deleted: results.deleted, 
      errors: results.errors,
      errorDetails: results.errorDetails 
    });
  } catch (error) {
    console.error('Error clearing demo events:', error);
    res.status(500).json({ error: error.message });
  }
});

// CSV Import - Preview endpoint
app.post('/api/csv/preview', upload.single('csvFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const events = parseCSVFromBuffer(req.file.buffer);
    const summary = getEventSummary(events);

    res.json({
      success: true,
      summary,
      sampleEvents: events.slice(0, 10), // Send first 10 events as preview
      events, // Send all events for report generation
    });
  } catch (error) {
    console.error('Error previewing CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// CSV Import - Create events endpoint
app.post('/api/csv/import', upload.single('csvFile'), async (req, res) => {
  try {
    if (DEMO_MODE) {
      // Demo mode: simulate import
      const events = parseCSVFromBuffer(req.file.buffer);
      const summary = getEventSummary(events);
      
      return res.json({
        success: true,
        demo: true,
        message: `[DEMO] Would have created ${summary.totalEvents} events for ${summary.totalParticipants} participants`,
        summary,
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!isAuthorized()) {
      return res.status(401).json({ error: 'Not authorized. Please authorize first.' });
    }

    const demoMode = req.body.demoMode === 'true';
    const events = parseCSVFromBuffer(req.file.buffer);
    const auth = getAuthorizedClient();

    // Get calendar configuration from environment
    const reminderCalendarId = process.env.REMINDER_CALENDAR_ID;
    const retentionCalendarId = process.env.RETENTION_CALENDAR_ID;
    const enableAttendees = process.env.ENABLE_ATTENDEES === 'true';
    const attendeeEmail = process.env.PRODUCTION_ATTENDEE_EMAIL;

    // Validate calendar configuration
    if (!reminderCalendarId || !retentionCalendarId) {
      console.warn('⚠️  REMINDER_CALENDAR_ID or RETENTION_CALENDAR_ID not set. Using default calendar.');
    }

    if (enableAttendees && !attendeeEmail) {
      console.warn('⚠️  ENABLE_ATTENDEES is true but PRODUCTION_ATTENDEE_EMAIL not set. No attendees will be added.');
    }

    const results = await createEventsFromCSV(auth, events, { 
      demoMode,
      reminderCalendarId,
      retentionCalendarId,
      enableAttendees,
      attendeeEmail,
    });

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete recent events (debugging tool)
app.post('/api/delete-recent', async (req, res) => {
  try {
    if (DEMO_MODE) {
      return res.json({
        success: true,
        demo: true,
        message: '[DEMO] Would have deleted recent automation events',
      });
    }

    if (!isAuthorized()) {
      return res.status(401).json({ error: 'Not authorized' });
    }

    const hours = parseInt(req.body.hours) || 24;
    const auth = getAuthorizedClient();
    const results = await deleteRecentEvents(auth, { hours });

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error deleting recent events:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check for Render
app.get('/health', (req, res) => {
  const credentialsExist = fs.existsSync(CREDENTIALS_PATH);
  const tokenExists = fs.existsSync(TOKEN_PATH);
  
  res.json({ 
    status: 'ok', 
    authorized: isAuthorized(),
    credentialsPath: CREDENTIALS_PATH,
    credentialsExist,
    tokenExists,
    env: {
      nodeEnv: process.env.NODE_ENV,
      hasRedirectUri: !!process.env.REDIRECT_URI,
      redirectUri: process.env.REDIRECT_URI || 'not set'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`\nOpen your browser and visit: http://localhost:${PORT}\n`);
  
  if (!isAuthorized()) {
    console.log('⚠️  First-time setup: You will be redirected to authorize with Google Calendar.\n');
  }
});

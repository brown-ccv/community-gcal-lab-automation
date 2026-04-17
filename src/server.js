import express from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import multer from 'multer';
import dotenv from 'dotenv';
import { createEvents, deleteEvents, deleteAllDemoEvents, createEventsFromCSV, deleteRecentEvents } from './calendar.js';
import { parseCSVFromBuffer, getEventSummary } from './csvParser.js';
import { extractProxyIdentity, getAuthenticatedEmail, requireAuth, requireGroupMember, isAuthBypassed } from './middleware/auth.js';
import { configurePassport, createAuthRoutes } from './routes/auth.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DEMO_MODE = process.env.DEMO_MODE === 'true';
const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true';
const AUTH_MODE = (process.env.AUTH_MODE || 'oauth').trim().toLowerCase();

// Configuration
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

console.log('Demo mode:', DEMO_MODE ? 'ENABLED (no real API calls)' : 'DISABLED (real calendar events)');
console.log('Auth bypass:', BYPASS_AUTH ? 'ENABLED (no authentication required)' : 'DISABLED (authentication required)');
console.log('Auth mode:', AUTH_MODE);

// Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production';
if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  SESSION_SECRET not set. Using default (not secure for production)');
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
configurePassport();
app.use(extractProxyIdentity);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files with conditional access
// Allow public access to login page, auth assets, and styles
app.use((req, res, next) => {
  // Public files that don't require authentication
  const publicFiles = ['/login.html', '/styles.css', '/health', '/api/auth/status'];
  const isPublic = publicFiles.some(file => req.path === file) || 
                   req.path.startsWith('/auth/');

  const hasTrustedIdentity = Boolean(getAuthenticatedEmail(req));

  // If already authenticated via trusted proxy identity/session, skip login page.
  if (req.path === '/login.html' && (hasTrustedIdentity || AUTH_MODE === 'proxy')) {
    return res.redirect('/');
  }
  
  if (isPublic || isAuthBypassed()) {
    return next();
  }
  
  // For protected static files, check authentication
  if (AUTH_MODE === 'proxy' || req.isAuthenticated() || hasTrustedIdentity) {
    return next();
  }
  
  // Not authenticated and trying to access protected file
  // Redirect to login if it's an HTML file, otherwise block
  if (req.path.endsWith('.html') || req.path === '/') {
    return res.redirect('/login.html');
  }
  
  return res.status(401).send('Unauthorized');
});

app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));

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

let calendarAuthClient = null;

function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON || '';
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Failed to parse service account credentials JSON:', error.message);
    return null;
  }
}

function isCalendarConfigured() {
  return Boolean(getServiceAccountCredentials());
}

function getCalendarAuthClient() {
  if (calendarAuthClient) {
    return calendarAuthClient;
  }

  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new Error('Calendar service account credentials are not configured. Set GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON or GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON.');
  }

  const subject = (process.env.GOOGLE_CALENDAR_IMPERSONATE_USER || '').trim() || undefined;
  calendarAuthClient = new google.auth.JWT({
    email: credentials.client_email,
    key: String(credentials.private_key).replace(/\\n/g, '\n'),
    scopes: [CALENDAR_SCOPE],
    subject,
  });

  return calendarAuthClient;
}

// Authentication routes
createAuthRoutes(app);

// Routes
const requireProtectedAccess = [requireAuth, requireGroupMember];

// API endpoint to check demo mode
app.get('/api/demo-mode', (req, res) => {
  res.json({ demoMode: DEMO_MODE });
});

// Home page (PROTECTED)
app.get('/', requireProtectedAccess, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Manual entry deep link (PROTECTED)
app.get('/manual-entry', requireProtectedAccess, (req, res) => {
  res.redirect('/?mode=manual');
});

// Legacy route retained for compatibility; calendar OAuth flow was removed.
app.get('/authorize', (req, res) => {
  res.status(410).json({
    error: 'Calendar OAuth flow is no longer used. Configure service account credentials and retry.',
  });
});

// Legacy route retained for compatibility; calendar OAuth flow was removed.
app.get('/oauth2callback', async (req, res) => {
  res.status(410).json({
    error: 'Calendar OAuth callback is deprecated. Service account auth is required.',
  });
});

// Create events endpoint (PROTECTED)
app.post('/create-events', requireProtectedAccess, async (req, res) => {
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

  if (DEMO_MODE) {
    try {
      // In demo mode, run dry-run generation so users can validate payload and schedule logic.
      const results = await createEvents({}, {
        baseDate,
        title,
        time: time || '09:00',
        attendeeEmail,
        calendarId: 'primary',
        dryRun: true,
        demoMode: true,
      });

      return res.json({
        success: true,
        demo: true,
        message: `[DEMO] Generated ${results.length} events without writing to Google Calendar`,
        results,
      });
    } catch (error) {
      console.error('Error creating demo events:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  
  try {
    const auth = getCalendarAuthClient();
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

// Delete events endpoint (PROTECTED)
app.post('/delete-events', requireProtectedAccess, async (req, res) => {
  const { baseDate, title, attendeeEmail } = req.body;
  
  if (!baseDate || !title || !attendeeEmail) {
    return res.status(400).json({ error: 'Base date, title, and attendee email are required.' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(attendeeEmail)) {
    return res.status(400).json({ error: 'Invalid email address format.' });
  }

  if (DEMO_MODE) {
    return res.json({
      success: true,
      demo: true,
      message: '[DEMO] Delete simulated. No calendar events were removed.',
      results: [
        {
          type: 'dry-run',
          title,
          baseDate,
          attendeeEmail,
        },
      ],
    });
  }
  
  try {
    const auth = getCalendarAuthClient();
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

// Clear all demo events endpoint (PROTECTED)
app.post('/clear-demo-events', requireProtectedAccess, async (req, res) => {
  if (DEMO_MODE) {
    return res.json({
      success: true,
      demo: true,
      deleted: 0,
      errors: 0,
      errorDetails: [],
      message: '[DEMO] Clear simulated. No calendar events were removed.',
    });
  }
  
  try {
    const auth = getCalendarAuthClient();
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

// CSV Import - Preview endpoint (PROTECTED)
app.post('/api/csv/preview', requireProtectedAccess, upload.single('csvFile'), (req, res) => {
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

// CSV Import - Create events endpoint (PROTECTED)
app.post('/api/csv/import', requireProtectedAccess, upload.single('csvFile'), async (req, res) => {
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

    const demoMode = req.body.demoMode === 'true';
    const events = parseCSVFromBuffer(req.file.buffer);
    const auth = getCalendarAuthClient();

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

// Delete recent events (debugging tool) (PROTECTED)
app.post('/api/delete-recent', requireProtectedAccess, async (req, res) => {
  try {
    if (DEMO_MODE) {
      return res.json({
        success: true,
        demo: true,
        message: '[DEMO] Would have deleted recent automation events',
      });
    }

    const hours = parseInt(req.body.hours) || 24;
    const auth = getCalendarAuthClient();
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
  res.json({
    status: 'ok',
    calendarConfigured: isCalendarConfigured(),
    demoMode: DEMO_MODE,
    authBypass: BYPASS_AUTH,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Server running at http://localhost:${PORT}`);
  console.log(`\nOpen your browser and visit: http://localhost:${PORT}\n`);

  if (!DEMO_MODE && !isCalendarConfigured()) {
    console.log('⚠️  Calendar service account credentials are not configured. Calendar writes will fail until GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON (or GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON) is set.\n');
  }
});

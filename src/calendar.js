import { google } from 'googleapis';

const TIMEZONE = 'America/New_York';
const DEFAULT_DURATION_MINUTES = 30;

// Define the follow-up intervals (in days from base date)
const FOLLOW_UP_TYPES = [
  { label: '1 day', days: 1 },
  { label: '10 day', days: 10 },
  { label: '45 day', days: 45 },
  // Add more as needed: { label: '1 week', days: 7 }, { label: '7 day post', days: 7 }
];

/**
 * Build idempotency key for an event
 */
function buildEventKey(baseDate, title, followUpType, attendeeEmail) {
  // Format: "2025-11-10_ParticipantID_10day_attendee@email.com"
  const datePart = baseDate.replace(/\//g, '-');
  const typePart = followUpType.replace(/\s+/g, '');
  const emailPart = attendeeEmail.toLowerCase().replace(/[^a-z0-9@.]/g, '_');
  return `${datePart}_${title}_${typePart}_${emailPart}`;
}

/**
 * Parse date (MM/DD/YYYY) and time (HH:MM) into ISO datetime string
 */
function buildDateTime(dateStr, timeStr) {
  // dateStr: MM/DD/YYYY
  const [month, day, year] = dateStr.split('/').map(s => s.trim());
  const [hour, minute] = timeStr.split(':').map(s => s.trim());
  
  // Build ISO string (no timezone suffix, will be added in event object)
  const mm = month.padStart(2, '0');
  const dd = day.padStart(2, '0');
  const hh = hour.padStart(2, '0');
  const min = minute.padStart(2, '0');
  
  return `${year}-${mm}-${dd}T${hh}:${min}:00`;
}

/**
 * Add days to a date string
 */
function addDays(dateStr, daysToAdd) {
  // dateStr format: MM/DD/YYYY
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);
  
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  const newYear = date.getFullYear();
  
  return `${newMonth}/${newDay}/${newYear}`;
}

/**
 * Create calendar events for all follow-up types
 */
export async function createEvents(auth, { baseDate, title, time, attendeeEmail, calendarId = 'primary', dryRun = false, demoMode = false }) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = [];

  for (const followUp of FOLLOW_UP_TYPES) {
    const eventDate = addDays(baseDate, followUp.days);
    const eventKey = buildEventKey(baseDate, title, followUp.label, attendeeEmail);
    const eventTitle = `${title} - ${followUp.label} check-in`;

    // Check if event already exists (idempotency)
    const existingEvent = await findEventByKey(calendar, calendarId, eventKey);
    
    if (existingEvent) {
      results.push({
        type: 'skipped',
        title: eventTitle,
        date: eventDate,
        reason: 'Event already exists (idempotent)',
        eventId: existingEvent.id,
      });
      continue;
    }

    // Build event object
    const startDateTime = buildDateTime(eventDate, time);
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60000);
    const endDateTime = endDate.toISOString().slice(0, 19);

    const event = {
      summary: eventTitle,
      start: {
        dateTime: startDateTime,
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: endDateTime,
        timeZone: TIMEZONE,
      },
      attendees: [{ email: attendeeEmail }],
      description: `Automated check-in event created for ${title}.\nBase date: ${baseDate}\nFollow-up type: ${followUp.label}`,
      reminders: {
        useDefault: false,
        overrides: [], // No reminders per requirements
      },
      extendedProperties: {
        private: {
          source: 'gcal-automation-demo',
          eventKey: eventKey,
          baseDate: baseDate,
          followUpType: followUp.label,
          attendeeEmail: attendeeEmail,
          demoMode: demoMode ? 'true' : 'false',
        },
      },
    };

    if (dryRun) {
      results.push({
        type: 'dry-run',
        title: eventTitle,
        date: eventDate,
        event: event,
      });
    } else {
      try {
        const response = await calendar.events.insert({
          calendarId: calendarId,
          resource: event,
          sendUpdates: 'all', // Send email invites immediately
        });
        
        results.push({
          type: 'created',
          title: eventTitle,
          date: eventDate,
          eventId: response.data.id,
          htmlLink: response.data.htmlLink,
        });
      } catch (error) {
        results.push({
          type: 'error',
          title: eventTitle,
          date: eventDate,
          error: error.message,
        });
      }
    }
  }

  return results;
}

/**
 * Find event by custom key (stored in extendedProperties)
 */
async function findEventByKey(calendar, calendarId, eventKey) {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      privateExtendedProperty: `eventKey=${eventKey}`,
      maxResults: 1,
      singleEvents: true,
    });

    return response.data.items && response.data.items.length > 0 ? response.data.items[0] : null;
  } catch (error) {
    console.error('Error searching for existing event:', error.message);
    return null;
  }
}

/**
 * Delete events matching base date and title
 */
export async function deleteEvents(auth, { baseDate, title, attendeeEmail, calendarId = 'primary' }) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = [];

  for (const followUp of FOLLOW_UP_TYPES) {
    const eventKey = buildEventKey(baseDate, title, followUp.label, attendeeEmail);
    const existingEvent = await findEventByKey(calendar, calendarId, eventKey);

    if (!existingEvent) {
      results.push({
        type: 'not-found',
        followUpType: followUp.label,
        eventKey: eventKey,
      });
      continue;
    }

    try {
      await calendar.events.delete({
        calendarId: calendarId,
        eventId: existingEvent.id,
        sendUpdates: 'all', // Notify attendees of cancellation
      });

      results.push({
        type: 'deleted',
        title: existingEvent.summary,
        eventId: existingEvent.id,
        followUpType: followUp.label,
      });
    } catch (error) {
      results.push({
        type: 'error',
        followUpType: followUp.label,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Delete all demo mode events
 * @param {OAuth2Client} auth - Authorized Google OAuth2 client
 * @param {Object} options
 * @param {string} options.calendarId - Calendar ID (default: 'primary')
 * @returns {Promise<Object>} Results with deleted count
 */
export async function deleteAllDemoEvents(auth, { calendarId = 'primary' } = {}) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = { deleted: 0, errors: 0, errorDetails: [] };

  try {
    // Search for all events with our demo source marker
    const response = await calendar.events.list({
      calendarId: calendarId,
      privateExtendedProperty: 'source=gcal-automation-demo',
      maxResults: 2500, // Google Calendar API max
      singleEvents: true,
    });

    const events = response.data.items || [];
    
    // Filter for demo mode events only
    const demoEvents = events.filter(event => 
      event.extendedProperties?.private?.demoMode === 'true'
    );

    console.log(`Found ${demoEvents.length} demo events to delete`);

    // Delete each demo event
    for (const event of demoEvents) {
      try {
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: event.id,
          sendUpdates: 'all', // Notify attendees of cancellation
        });
        results.deleted++;
      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          eventId: event.id,
          summary: event.summary,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to list demo events: ${error.message}`);
  }
}

/**
 * Build idempotency key for CSV event
 */
function buildCSVEventKey(participantId, date, column) {
  // Format: "701_11-2-2025_B2STARTMIN10"
  const datePart = date.replace(/\//g, '-');
  return `${participantId}_${datePart}_${column}`;
}

/**
 * Create calendar events from CSV data
 * @param {Object} auth - Google OAuth2 client
 * @param {Array} events - Array of event objects from CSV parser
 * @param {string} time - Default time for events (e.g., "09:00")
 * @param {string} calendarId - Calendar ID (default: 'primary')
 * @param {boolean} dryRun - If true, don't actually create events
 * @param {boolean} demoMode - If true, mark events as demo for easy cleanup
 * @returns {Object} Results summary
 */
export async function createEventsFromCSV(auth, events, { time = '09:00', calendarId = 'primary', dryRun = false, demoMode = false }) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = {
    created: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const event of events) {
    const eventKey = buildCSVEventKey(event.participantId, event.date, event.column);
    
    try {
      // Check if event already exists (idempotency)
      const existingEvent = await findEventByKey(calendar, calendarId, eventKey);
      
      if (existingEvent) {
        results.skipped++;
        results.details.push({
          type: 'skipped',
          participantId: event.participantId,
          title: event.title,
          date: event.date,
          reason: 'Event already exists',
        });
        continue;
      }

      if (dryRun) {
        results.details.push({
          type: 'dry-run',
          participantId: event.participantId,
          title: event.title,
          date: event.date,
          time,
        });
        continue;
      }

      // Build event object
      const startDateTime = buildDateTime(event.date, time);
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60000);
      const endDateTime = endDate.toISOString().slice(0, 19);

      const calendarEvent = {
        summary: `${event.title} - Participant ${event.participantId}`,
        description: `Participant ID: ${event.participantId}\nColumn: ${event.column}`,
        start: {
          dateTime: startDateTime,
          timeZone: TIMEZONE,
        },
        end: {
          dateTime: endDateTime,
          timeZone: TIMEZONE,
        },
        extendedProperties: {
          private: {
            idempotencyKey: eventKey,
            participantId: event.participantId,
            column: event.column,
            source: 'csv-import',
            demoMode: demoMode ? 'true' : 'false',
          },
        },
      };

      // Create the event
      const response = await calendar.events.insert({
        calendarId,
        resource: calendarEvent,
      });

      results.created++;
      results.details.push({
        type: 'created',
        participantId: event.participantId,
        title: event.title,
        date: event.date,
        eventId: response.data.id,
      });

    } catch (error) {
      results.errors++;
      results.details.push({
        type: 'error',
        participantId: event.participantId,
        title: event.title,
        date: event.date,
        error: error.message,
      });
    }
  }

  return results;
}

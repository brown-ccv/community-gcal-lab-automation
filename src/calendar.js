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
 * Shift weekend dates to the previous Friday
 * @param {string} dateStr - Date in MM/DD/YYYY format
 * @returns {Object} - { adjustedDate: string, wasShifted: boolean, originalDate: string }
 */
function shiftWeekendToFriday(dateStr) {
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  let wasShifted = false;
  const originalDate = dateStr;
  
  // If Saturday (6), shift back 1 day to Friday
  if (dayOfWeek === 6) {
    date.setDate(date.getDate() - 1);
    wasShifted = true;
  }
  // If Sunday (0), shift back 2 days to Friday
  else if (dayOfWeek === 0) {
    date.setDate(date.getDate() - 2);
    wasShifted = true;
  }
  
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  const newYear = date.getFullYear();
  const adjustedDate = `${newMonth}/${newDay}/${newYear}`;
  
  return { adjustedDate, wasShifted, originalDate };
}

/**
 * Create calendar events for all follow-up types
 */
export async function createEvents(auth, { baseDate, title, time, attendeeEmail, calendarId = 'primary', dryRun = false, demoMode = false }) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = [];
  
  // Hardcoded time (9:00 AM - 9:30 AM)
  const eventTime = '09:00';
  
  // Extract participant ID from attendee email (e.g., "701@example.com" -> "701")
  const participantId = attendeeEmail.split('@')[0];

  for (const followUp of FOLLOW_UP_TYPES) {
    const rawEventDate = addDays(baseDate, followUp.days);
    const { adjustedDate: eventDate, wasShifted, originalDate } = shiftWeekendToFriday(rawEventDate);
    const eventKey = buildEventKey(baseDate, title, followUp.label, attendeeEmail);
    const eventTitle = `${participantId} - ${title} - ${followUp.label} check-in`;

    // Check if event already exists (idempotency)
    const existingEvent = await findEventByKey(calendar, calendarId, eventKey);
    
    if (existingEvent) {
      results.push({
        type: 'skipped',
        title: eventTitle,
        date: eventDate,
        wasShifted,
        originalDate: wasShifted ? originalDate : null,
        reason: 'Event already exists (idempotent)',
        eventId: existingEvent.id,
      });
      continue;
    }

    // Build event object
    const startDateTime = buildDateTime(eventDate, eventTime);
    const startDate = new Date(startDateTime);
    const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60000);
    const endDateTime = endDate.toISOString().slice(0, 19);
    
    let description = `Automated check-in event created for ${title}.\nBase date: ${baseDate}\nFollow-up type: ${followUp.label}\nParticipant: ${participantId}`;
    if (wasShifted) {
      description += `\n\nNote: Original date ${originalDate} fell on a weekend and was shifted to ${eventDate} (Friday).`;
    }

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
      description,
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
        wasShifted,
        originalDate: wasShifted ? originalDate : null,
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
          wasShifted,
          originalDate: wasShifted ? originalDate : null,
          eventId: response.data.id,
          htmlLink: response.data.htmlLink,
        });
      } catch (error) {
        results.push({
          type: 'error',
          title: eventTitle,
          date: eventDate,
          wasShifted,
          originalDate: wasShifted ? originalDate : null,
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
    // Search for events from both manual entry and CSV import
    const sources = ['gcal-automation-demo', 'csv-import'];
    let allDemoEvents = [];

    for (const source of sources) {
      const response = await calendar.events.list({
        calendarId: calendarId,
        privateExtendedProperty: `source=${source}`,
        maxResults: 2500, // Google Calendar API max
        singleEvents: true,
      });

      const events = response.data.items || [];
      
      // Filter for demo mode events only
      const demoEvents = events.filter(event => 
        event.extendedProperties?.private?.demoMode === 'true'
      );

      allDemoEvents = allDemoEvents.concat(demoEvents);
    }

    console.log(`Found ${allDemoEvents.length} demo events to delete`);

    // Delete each demo event
    for (const event of allDemoEvents) {
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
 * Delete all events created in the last N hours (debugging tool)
 * @param {OAuth2Client} auth - Authorized Google OAuth2 client
 * @param {Object} options
 * @param {number} options.hours - Number of hours to look back (default: 24)
 * @param {string} options.calendarId - Calendar ID (default: 'primary')
 * @returns {Promise<Object>} Results with deleted count
 */
export async function deleteRecentEvents(auth, { hours = 24, calendarId = 'primary' } = {}) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = { deleted: 0, errors: 0, errorDetails: [], eventsFound: [] };

  try {
    // Calculate time range
    const now = new Date();
    const timeMin = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    console.log(`Searching for events created after ${timeMin.toISOString()}`);

    // Get all events in the calendar
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin.toISOString(),
      maxResults: 2500,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    // Filter for events from our automation (both manual and CSV)
    const automationEvents = events.filter(event => {
      const source = event.extendedProperties?.private?.source;
      return source === 'gcal-automation-demo' || source === 'csv-import';
    });

    console.log(`Found ${automationEvents.length} automation events in the last ${hours} hours`);

    // Store event summaries for reporting
    results.eventsFound = automationEvents.map(e => ({
      id: e.id,
      summary: e.summary,
      start: e.start.dateTime || e.start.date,
      source: e.extendedProperties?.private?.source,
    }));

    // Delete each event
    for (const event of automationEvents) {
      try {
        await calendar.events.delete({
          calendarId: calendarId,
          eventId: event.id,
          sendUpdates: 'all',
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
    throw new Error(`Failed to delete recent events: ${error.message}`);
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
 * @param {string} calendarId - Calendar ID (default: 'primary') - DEPRECATED, use reminderCalendarId/retentionCalendarId
 * @param {string} reminderCalendarId - Calendar ID for reminder events
 * @param {string} retentionCalendarId - Calendar ID for retention events
 * @param {boolean} dryRun - If true, don't actually create events
 * @param {boolean} demoMode - If true, mark events as demo for easy cleanup
 * @param {boolean} enableAttendees - If true, add PRODUCTION_ATTENDEE_EMAIL to events
 * @param {string} attendeeEmail - Email to add as attendee (when enableAttendees is true)
 * @returns {Object} Results summary
 */
export async function createEventsFromCSV(auth, events, { 
  time = '09:00', 
  calendarId = 'primary', 
  reminderCalendarId = null,
  retentionCalendarId = null,
  dryRun = false, 
  demoMode = false,
  enableAttendees = false,
  attendeeEmail = null,
}) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = {
    created: 0,
    skipped: 0,
    errors: 0,
    details: [],
    reminderEvents: 0,
    retentionEvents: 0,
  };
  
  // Hardcoded time (9:00 AM - 9:30 AM) for reminder events
  const eventTime = '09:00';

  for (const event of events) {
    // Determine which calendar to use based on event type
    let targetCalendarId;
    if (event.calendarType === 'reminder') {
      targetCalendarId = reminderCalendarId || calendarId;
    } else if (event.calendarType === 'retention') {
      targetCalendarId = retentionCalendarId || calendarId;
    } else {
      // Fallback to default calendar for unknown types
      targetCalendarId = calendarId;
    }

    const { adjustedDate: eventDate, wasShifted, originalDate } = shiftWeekendToFriday(event.date);
    const eventKey = buildCSVEventKey(event.participantId, eventDate, event.column);
    
    try {
      // Check if event already exists (idempotency)
      const existingEvent = await findEventByKey(calendar, targetCalendarId, eventKey);
      
      if (existingEvent) {
        results.skipped++;
        results.details.push({
          type: 'skipped',
          participantId: event.participantId,
          title: event.title,
          date: eventDate,
          wasShifted,
          originalDate: wasShifted ? originalDate : null,
          reason: 'Event already exists',
          calendarType: event.calendarType,
        });
        continue;
      }

      if (dryRun) {
        results.details.push({
          type: 'dry-run',
          participantId: event.participantId,
          title: event.title,
          date: eventDate,
          wasShifted,
          originalDate: wasShifted ? originalDate : null,
          time: event.eventType === 'retention' ? 'All-day' : eventTime,
          calendarType: event.calendarType,
        });
        continue;
      }

      // Build description
      let description = `Participant ID: ${event.participantId}\nColumn: ${event.column}\nEvent Type: ${event.eventType}`;
      if (event.baseDate) {
        description += `\nBase Date: ${event.baseDate}\nRetention Date (45 days before): ${eventDate}`;
      }
      if (wasShifted) {
        description += `\n\nNote: Original date ${originalDate} fell on a weekend and was shifted to ${eventDate} (Friday).`;
      }

      // Build event object - different format for retention (all-day) vs reminder (timed)
      let calendarEvent;
      
      if (event.eventType === 'retention') {
        // All-day event for retention
        const [month, day, year] = eventDate.split('/');
        const dateOnly = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        calendarEvent = {
          summary: `${event.participantId} - ${event.title}`,
          description,
          start: {
            date: dateOnly, // All-day events use 'date' instead of 'dateTime'
          },
          end: {
            date: dateOnly, // Same day
          },
          extendedProperties: {
            private: {
              idempotencyKey: eventKey,
              participantId: event.participantId,
              column: event.column,
              eventType: event.eventType,
              calendarType: event.calendarType,
              source: 'csv-import',
              demoMode: demoMode ? 'true' : 'false',
            },
          },
        };
      } else {
        // Timed event for reminders (9:00 AM - 9:30 AM)
        const startDateTime = buildDateTime(eventDate, eventTime);
        const startDate = new Date(startDateTime);
        const endDate = new Date(startDate.getTime() + DEFAULT_DURATION_MINUTES * 60000);
        const endDateTime = endDate.toISOString().slice(0, 19);
        
        calendarEvent = {
          summary: `${event.participantId} - ${event.title}`,
          description,
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
              eventType: event.eventType,
              calendarType: event.calendarType,
              source: 'csv-import',
              demoMode: demoMode ? 'true' : 'false',
            },
          },
        };
      }

      // Add attendees if enabled
      if (enableAttendees && attendeeEmail) {
        calendarEvent.attendees = [{ email: attendeeEmail }];
      }

      // Create the event
      const response = await calendar.events.insert({
        calendarId: targetCalendarId,
        resource: calendarEvent,
        sendUpdates: enableAttendees ? 'all' : 'none', // Only send emails if attendees enabled
      });

      results.created++;
      
      // Track event type counts
      if (event.eventType === 'retention') {
        results.retentionEvents++;
      } else if (event.eventType === 'reminder') {
        results.reminderEvents++;
      }
      
      results.details.push({
        type: 'created',
        participantId: event.participantId,
        title: `${event.participantId} - ${event.title}`,
        date: eventDate,
        wasShifted,
        originalDate: wasShifted ? originalDate : null,
        eventId: response.data.id,
        calendarType: event.calendarType,
        eventType: event.eventType,
        hasAttendees: enableAttendees && attendeeEmail ? true : false,
      });

    } catch (error) {
      results.errors++;
      results.details.push({
        type: 'error',
        participantId: event.participantId,
        title: event.title,
        date: eventDate,
        wasShifted,
        originalDate: wasShifted ? originalDate : null,
        error: error.message,
        calendarType: event.calendarType,
      });
    }
  }

  return results;
}

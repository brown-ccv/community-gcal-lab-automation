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
 * Shift weekend dates to the nearest weekday.
 * Saturday moves to Friday. Sunday moves to Monday.
 * @param {string} dateStr - Date in MM/DD/YYYY format
 * @returns {Object} - { adjustedDate: string, wasShifted: boolean, originalDate: string, shiftedTo: string|null }
 */
function shiftWeekendDate(dateStr) {
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  let wasShifted = false;
  const originalDate = dateStr;
  
  // If Saturday -> Friday, Sunday -> Monday
  let shiftedTo = null;
  if (dayOfWeek === 6) {
    date.setDate(date.getDate() - 1);
    wasShifted = true;
    shiftedTo = 'Friday';
  } else if (dayOfWeek === 0) {
    // Sunday -> Monday
    date.setDate(date.getDate() + 1);
    wasShifted = true;
    shiftedTo = 'Monday';
  }
  
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  const newYear = date.getFullYear();
  const adjustedDate = `${newMonth}/${newDay}/${newYear}`;
  
  return { adjustedDate, wasShifted, originalDate, shiftedTo };
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
      const { adjustedDate: eventDate, wasShifted, originalDate, shiftedTo } = shiftWeekendDate(rawEventDate);
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
          shiftedTo,
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
      description += `\n\nNote: Original date ${originalDate} fell on a weekend and was shifted to ${shiftedTo} (${eventDate}).`;
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
        calendarId,
        wasShifted,
        shiftedTo: wasShifted ? shiftedTo : null,
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
          calendarId,
          wasShifted,
          shiftedTo: wasShifted ? shiftedTo : null,
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
          shiftedTo: wasShifted ? shiftedTo : null,
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
async function findEventByKey(calendar, calendarId, eventKey, propertyName = 'eventKey') {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      privateExtendedProperty: `${propertyName}=${eventKey}`,
      maxResults: 1,
      singleEvents: true,
    });

    return response.data.items && response.data.items.length > 0 ? response.data.items[0] : null;
  } catch (error) {
    const statusCode = error?.code || error?.response?.status;
    // Not Found is a common signal for inaccessible/non-existent calendar IDs.
    // Return null here to avoid logging the same noisy error for every CSV row.
    if (statusCode === 404 || /not found/i.test(String(error?.message || ''))) {
      return null;
    }

    console.error(`Error searching for existing event in calendar ${calendarId}:`, error.message);
    return null;
  }
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
  const calendarIds = Array.isArray(calendarId)
    ? [...new Set(calendarId.map((id) => String(id || '').trim()).filter(Boolean))]
    : [String(calendarId || 'primary').trim() || 'primary'];

  try {
    // Search for events from both manual entry and CSV import across all configured calendars.
    const sources = ['gcal-automation-demo', 'csv-import'];
    let allDemoEvents = [];

    for (const targetCalendarId of calendarIds) {
      for (const source of sources) {
        const response = await calendar.events.list({
          calendarId: targetCalendarId,
          privateExtendedProperty: `source=${source}`,
          maxResults: 2500, // Google Calendar API max
          singleEvents: true,
        });

        const events = response.data.items || [];
        
        // Filter for demo mode events only
        const demoEvents = events
          .filter(event => event.extendedProperties?.private?.demoMode === 'true')
          .map((event) => ({ ...event, _calendarId: targetCalendarId }));

        allDemoEvents = allDemoEvents.concat(demoEvents);
      }
    }

    console.log(`Found ${allDemoEvents.length} demo events to delete`);

    // Delete each demo event
    for (const event of allDemoEvents) {
      try {
        await calendar.events.delete({
          calendarId: event._calendarId || 'primary',
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
 * Undo a prior event creation batch by deleting the exact event IDs that were created.
 * @param {OAuth2Client} auth - Authorized Google OAuth2 client
 * @param {Object} options
 * @param {Array} options.events - [{ eventId, calendarId, summary? }]
 * @returns {Promise<Object>} Results with deleted count
 */
export async function undoCreatedEvents(auth, { events = [] } = {}) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = { undone: 0, errors: 0, errorDetails: [], eventsTargeted: [] };
  const normalizedEvents = Array.isArray(events)
    ? events
      .map((event) => ({
        eventId: String(event?.eventId || '').trim(),
        calendarId: String(event?.calendarId || 'primary').trim() || 'primary',
        summary: String(event?.summary || '').trim(),
      }))
      .filter((event) => event.eventId)
    : [];

  results.eventsTargeted = normalizedEvents;

  for (const event of normalizedEvents) {
    try {
      await calendar.events.delete({
        calendarId: event.calendarId,
        eventId: event.eventId,
        sendUpdates: 'all',
      });
      results.undone++;
    } catch (error) {
      results.errors++;
      results.errorDetails.push({
        eventId: event.eventId,
        calendarId: event.calendarId,
        summary: event.summary,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Delete all events for specific participants by their ID
 * @param {OAuth2Client} auth - Authorized Google OAuth2 client
 * @param {Object} options
 * @param {Array<string>} options.participantIds - Participant IDs to delete events for
 * @param {string|Array<string>} options.calendarIds - Calendar ID(s) to search (default: 'primary')
 * @returns {Promise<Object>} Results with deleted count
 */
export async function deleteEventsByParticipantId(auth, { participantIds = [], calendarIds = 'primary' } = {}) {
  const calendar = google.calendar({ version: 'v3', auth });
  const results = { deleted: 0, errors: 0, errorDetails: [], participantsProcessed: 0 };
  
  // Normalize participant IDs
  const normalizedParticipantIds = Array.isArray(participantIds)
    ? [...new Set(participantIds.map(id => String(id || '').trim()).filter(Boolean))]
    : [];

  if (normalizedParticipantIds.length === 0) {
    return results;
  }

  // Normalize calendar IDs
  const normalizedCalendarIds = Array.isArray(calendarIds)
    ? [...new Set(calendarIds.map(id => String(id || '').trim()).filter(Boolean))]
    : [String(calendarIds || 'primary').trim() || 'primary'];

  try {
    let allParticipantEvents = [];

    // Search for events with matching participant IDs
    for (const targetCalendarId of normalizedCalendarIds) {
      for (const participantId of normalizedParticipantIds) {
        try {
          const response = await calendar.events.list({
            calendarId: targetCalendarId,
            q: `ParticipantId - ${participantId}`, // Search by title prefix
            maxResults: 2500,
            singleEvents: true,
          });

          const events = response.data.items || [];
          const participantEvents = events
            .filter(event => {
              // Only delete events that were created by this automation (have extended properties)
              return event.extendedProperties?.private?.source !== undefined;
            })
            .map(event => ({ ...event, _calendarId: targetCalendarId, _participantId: participantId }));

          allParticipantEvents = allParticipantEvents.concat(participantEvents);
        } catch (error) {
          console.error(`Error searching for participant ${participantId}:`, error.message);
        }
      }
    }

    results.participantsProcessed = normalizedParticipantIds.length;
    console.log(`Found ${allParticipantEvents.length} events to delete for participants: ${normalizedParticipantIds.join(', ')}`);

    // Delete each event
    for (const event of allParticipantEvents) {
      try {
        await calendar.events.delete({
          calendarId: event._calendarId || 'primary',
          eventId: event.id,
          sendUpdates: 'all', // Notify attendees of cancellation
        });
        results.deleted++;
      } catch (error) {
        results.errors++;
        results.errorDetails.push({
          eventId: event.id,
          calendarId: event._calendarId,
          participantId: event._participantId,
          summary: event.summary,
          error: error.message,
        });
      }
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to delete events by participant: ${error.message}`);
  }
}
function buildCSVEventKey(participantId, date, column) {
  // Format: "701_11-2-2025_B2STARTMIN10"
  const datePart = date.replace(/\//g, '-');
  return `${participantId}_${datePart}_${column}`;
}

async function ensureCsvCalendarsAccessible(calendar, reminderCalendarId, retentionCalendarId) {
  const checks = [
    ['reminder', reminderCalendarId],
    ['retention', retentionCalendarId],
  ];

  for (const [label, id] of checks) {
    try {
      await calendar.calendars.get({ calendarId: id });
    } catch (error) {
      throw new Error(`Unable to access ${label} calendar (${id}): ${error.message}`);
    }
  }
}

export async function partitionCSVEventsByIdempotency(auth, events, {
  calendarId = 'primary',
  reminderCalendarId = null,
  retentionCalendarId = null,
} = {}) {
  const calendar = google.calendar({ version: 'v3', auth });
  const normalizedReminderCalendarId = String(reminderCalendarId || '').trim();
  const normalizedRetentionCalendarId = String(retentionCalendarId || '').trim();
  const normalizedDefaultCalendarId = String(calendarId || 'primary').trim();

  if (!normalizedReminderCalendarId || !normalizedRetentionCalendarId) {
    throw new Error('REMINDER_CALENDAR_ID and RETENTION_CALENDAR_ID must both be configured for CSV previews/imports.');
  }

  await ensureCsvCalendarsAccessible(calendar, normalizedReminderCalendarId, normalizedRetentionCalendarId);

  const newEvents = [];
  const duplicateEvents = [];

  for (const event of events) {
    let targetCalendarId;
    if (event.calendarType === 'reminder') {
      targetCalendarId = normalizedReminderCalendarId || normalizedDefaultCalendarId;
    } else if (event.calendarType === 'retention') {
      targetCalendarId = normalizedRetentionCalendarId || normalizedDefaultCalendarId;
    } else {
      targetCalendarId = normalizedDefaultCalendarId;
    }

    const { adjustedDate: eventDate, wasShifted, originalDate, shiftedTo } = shiftWeekendDate(event.date);
    const eventKey = buildCSVEventKey(event.participantId, eventDate, event.column);
    const existingEvent = await findEventByKey(calendar, targetCalendarId, eventKey, 'idempotencyKey');

    if (existingEvent) {
      duplicateEvents.push({
        ...event,
        date: eventDate,
        targetCalendarId,
        existingEventId: existingEvent.id,
      });
      continue;
    }

    newEvents.push({
      ...event,
      date: eventDate,
      targetCalendarId,
    });
  }

  return {
    newEvents,
    duplicateEvents,
  };
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
  const normalizedReminderCalendarId = String(reminderCalendarId || '').trim();
  const normalizedRetentionCalendarId = String(retentionCalendarId || '').trim();
  const normalizedDefaultCalendarId = String(calendarId || 'primary').trim();

  if (!normalizedReminderCalendarId || !normalizedRetentionCalendarId) {
    throw new Error('REMINDER_CALENDAR_ID and RETENTION_CALENDAR_ID must both be configured for CSV imports.');
  }

  await ensureCsvCalendarsAccessible(calendar, normalizedReminderCalendarId, normalizedRetentionCalendarId);

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
      targetCalendarId = normalizedReminderCalendarId || normalizedDefaultCalendarId;
    } else if (event.calendarType === 'retention') {
      targetCalendarId = normalizedRetentionCalendarId || normalizedDefaultCalendarId;
    } else {
      // Fallback to default calendar for unknown types
      targetCalendarId = normalizedDefaultCalendarId;
    }

    const { adjustedDate: eventDate, wasShifted, originalDate, shiftedTo } = shiftWeekendDate(event.date);
    const eventKey = buildCSVEventKey(event.participantId, eventDate, event.column);
    
    try {
      // Check if event already exists (idempotency)
      const existingEvent = await findEventByKey(calendar, targetCalendarId, eventKey, 'idempotencyKey');
      
      if (existingEvent) {
        results.skipped++;
        results.details.push({
          type: 'skipped',
          participantId: event.participantId,
          title: event.title,
          date: eventDate,
          wasShifted,
          shiftedTo: wasShifted ? shiftedTo : null,
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
          shiftedTo: wasShifted ? shiftedTo : null,
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
        description += `\n\nNote: Original date ${originalDate} fell on a weekend and was shifted to ${shiftedTo} (${eventDate}).`;
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
        calendarId: targetCalendarId,
        wasShifted,
        shiftedTo: wasShifted ? shiftedTo : null,
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
        shiftedTo: wasShifted ? shiftedTo : null,
        originalDate: wasShifted ? originalDate : null,
        error: error.message,
        calendarType: event.calendarType,
      });
    }
  }

  return results;
}

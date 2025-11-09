#!/usr/bin/env node
import { authorize } from './auth.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get calendar IDs from environment
const REMINDER_CALENDAR_ID = process.env.REMINDER_CALENDAR_ID || 'primary';
const RETENTION_CALENDAR_ID = process.env.RETENTION_CALENDAR_ID || 'primary';

async function deleteCSVEvents() {
  console.log('🔐 Authenticating...');
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  console.log('\n🔍 Searching for events created from CSV import...');
  console.log(`   • Reminder Calendar: ${REMINDER_CALENDAR_ID}`);
  console.log(`   • Retention Calendar: ${RETENTION_CALENDAR_ID}\n`);
  
  let totalDeleted = 0;
  let totalErrors = 0;
  let allEvents = [];

  // Get unique calendar IDs
  const calendarsToCheck = [...new Set([REMINDER_CALENDAR_ID, RETENTION_CALENDAR_ID])];

  // Search for events in each calendar
  for (const calendarId of calendarsToCheck) {
    try {
      const response = await calendar.events.list({
        calendarId: calendarId,
        privateExtendedProperty: 'source=csv-import',
        maxResults: 2500,
        singleEvents: true,
      });

      const events = response.data.items || [];
      if (events.length > 0) {
        const calendarName = calendarId === REMINDER_CALENDAR_ID ? 'Reminder' : 
                            calendarId === RETENTION_CALENDAR_ID ? 'Retention' : 'Default';
        console.log(`Found ${events.length} events in ${calendarName} Calendar`);
        
        // Add calendar ID to each event for deletion
        events.forEach(event => {
          event._calendarId = calendarId;
        });
        
        allEvents = allEvents.concat(events);
      }
    } catch (error) {
      console.error(`Error searching calendar ${calendarId}:`, error.message);
    }
  }

  console.log(`\nTotal CSV-imported events found: ${allEvents.length}\n`);

  if (allEvents.length === 0) {
    console.log('✅ No CSV events found. Nothing to delete.');
    return;
  }

  // Show first few events
  console.log('Preview of events to delete:');
  allEvents.slice(0, 5).forEach(event => {
    const participantId = event.extendedProperties?.private?.participantId;
    const eventType = event.extendedProperties?.private?.eventType || 'unknown';
    const calendarType = event.extendedProperties?.private?.calendarType || 'unknown';
    console.log(`  • ${event.summary} [${eventType}/${calendarType}] (${event.start.dateTime || event.start.date})`);
  });
  
  if (allEvents.length > 5) {
    console.log(`  ... and ${allEvents.length - 5} more\n`);
  }

  console.log('\n🗑️  Deleting events...');
  
  for (const event of allEvents) {
    try {
      await calendar.events.delete({
        calendarId: event._calendarId,
        eventId: event.id,
        sendUpdates: 'all',
      });
      totalDeleted++;
      process.stdout.write(`\rDeleted: ${totalDeleted}/${allEvents.length}`);
    } catch (error) {
      totalErrors++;
      console.error(`\nError deleting ${event.summary}:`, error.message);
    }
  }

  console.log('\n\n✅ Cleanup complete!');
  console.log(`   • Deleted: ${totalDeleted}`);
  console.log(`   • Errors: ${totalErrors}`);
}

deleteCSVEvents().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

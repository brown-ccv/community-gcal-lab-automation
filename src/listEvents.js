#!/usr/bin/env node
import { authorize } from './auth.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get calendar IDs from environment
const REMINDER_CALENDAR_ID = process.env.REMINDER_CALENDAR_ID || 'primary';
const RETENTION_CALENDAR_ID = process.env.RETENTION_CALENDAR_ID || 'primary';

async function listAllEvents() {
  console.log('🔐 Authenticating...');
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  const calendarsToCheck = [
    { id: REMINDER_CALENDAR_ID, name: 'Reminder' },
    { id: RETENTION_CALENDAR_ID, name: 'Retention' },
  ];

  for (const cal of calendarsToCheck) {
    console.log(`\n📅 ${cal.name} Calendar (${cal.id})`);
    console.log('='.repeat(60));
    
    try {
      const response = await calendar.events.list({
        calendarId: cal.id,
        timeMin: new Date('2025-01-01').toISOString(),
        maxResults: 100,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];
      console.log(`Found ${events.length} events\n`);

      if (events.length === 0) {
        console.log('No events found.\n');
        continue;
      }

      events.forEach((event, index) => {
        const start = event.start.dateTime || event.start.date;
        const source = event.extendedProperties?.private?.source || 'unknown';
        const participantId = event.extendedProperties?.private?.participantId || 'N/A';
        const eventType = event.extendedProperties?.private?.eventType || 'N/A';
        
        console.log(`${index + 1}. ${event.summary}`);
        console.log(`   Date: ${start}`);
        console.log(`   Source: ${source}`);
        console.log(`   Participant: ${participantId}`);
        console.log(`   Event Type: ${eventType}`);
        console.log(`   ID: ${event.id}`);
        console.log('');
      });
    } catch (error) {
      console.error(`Error listing events: ${error.message}`);
    }
  }
}

listAllEvents().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

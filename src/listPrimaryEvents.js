#!/usr/bin/env node
import { authorize } from './auth.js';
import { google } from 'googleapis';

async function listPrimaryEvents() {
  console.log('🔐 Authenticating...');
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  console.log('\n📅 PRIMARY Calendar');
  console.log('='.repeat(60));
  
  try {
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date('2025-10-01').toISOString(),
      maxResults: 100,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`Found ${events.length} events\n`);

    if (events.length === 0) {
      console.log('No events found.\n');
      return;
    }

    events.forEach((event, index) => {
      const start = event.start.dateTime || event.start.date;
      const source = event.extendedProperties?.private?.source || 'unknown';
      const participantId = event.extendedProperties?.private?.participantId || 'N/A';
      const eventType = event.extendedProperties?.private?.eventType || 'N/A';
      const calendarType = event.extendedProperties?.private?.calendarType || 'N/A';
      
      console.log(`${index + 1}. ${event.summary}`);
      console.log(`   Date: ${start}`);
      console.log(`   Source: ${source}`);
      console.log(`   Participant: ${participantId}`);
      console.log(`   Event Type: ${eventType}`);
      console.log(`   Calendar Type: ${calendarType}`);
      console.log(`   ID: ${event.id}`);
      console.log('');
    });
  } catch (error) {
    console.error(`Error listing events: ${error.message}`);
  }
}

listPrimaryEvents().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});

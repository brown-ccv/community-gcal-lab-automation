#!/usr/bin/env node
import { authorize } from './auth.js';
import { google } from 'googleapis';

// Participant IDs from the CSV
const participantIds = ['701', '702', '703', '704'];

async function deleteCSVEvents() {
  console.log('🔐 Authenticating...');
  const auth = await authorize();
  const calendar = google.calendar({ version: 'v3', auth });

  console.log('\n🔍 Searching for events created from CSV import...');
  
  let totalDeleted = 0;
  let totalErrors = 0;

  // Search for events with csv-import source
  const response = await calendar.events.list({
    calendarId: 'primary',
    privateExtendedProperty: 'source=csv-import',
    maxResults: 2500,
    singleEvents: true,
  });

  const events = response.data.items || [];
  console.log(`Found ${events.length} CSV-imported events\n`);

  if (events.length === 0) {
    console.log('✅ No CSV events found. Nothing to delete.');
    return;
  }

  // Show first few events
  console.log('Preview of events to delete:');
  events.slice(0, 5).forEach(event => {
    const participantId = event.extendedProperties?.private?.participantId;
    console.log(`  • ${event.summary} (${event.start.dateTime || event.start.date})`);
  });
  
  if (events.length > 5) {
    console.log(`  ... and ${events.length - 5} more\n`);
  }

  console.log('\n🗑️  Deleting events...');
  
  for (const event of events) {
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: event.id,
        sendUpdates: 'all',
      });
      totalDeleted++;
      process.stdout.write(`\rDeleted: ${totalDeleted}/${events.length}`);
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

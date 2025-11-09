#!/usr/bin/env node
import readline from 'readline';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authorize } from './auth.js';
import { createEventsFromCSV } from './calendar.js';
import { parseCSV, getEventSummary } from './csvParser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('\n📊 CSV Import Tool for Google Calendar\n');
  console.log('This tool imports events from FileMaker CSV exports.\n');

  // Get CSV file path
  const defaultPath = path.join(__dirname, 'data', 'P16_FM_dates.csv');
  const csvPath = await question(`Enter CSV file path (default: ${defaultPath}): `);
  const filePath = csvPath.trim() || defaultPath;

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Error: File not found: ${filePath}`);
    rl.close();
    process.exit(1);
  }

  // Parse CSV
  console.log('\n📖 Parsing CSV file...');
  let events;
  try {
    events = parseCSV(filePath);
  } catch (error) {
    console.error(`\n❌ Error parsing CSV: ${error.message}`);
    rl.close();
    process.exit(1);
  }

  // Show summary
  const summary = getEventSummary(events);
  console.log('\n📋 CSV Summary:');
  console.log(`   • Total participants: ${summary.totalParticipants}`);
  console.log(`   • Total events: ${summary.totalEvents}`);
  console.log('\n   Events by type:');
  for (const [type, count] of Object.entries(summary.eventsByType)) {
    console.log(`   • ${type}: ${count}`);
  }

  // Get time
  const timeInput = await question('\n⏰ What time should events be created? (default: 09:00): ');
  const time = timeInput.trim() || '09:00';

  // Dry run option
  const dryRunInput = await question('\n🧪 Dry run mode? (yes/no, default: yes): ');
  const dryRun = dryRunInput.trim() === '' || dryRunInput.toLowerCase() === 'yes';

  if (!dryRun) {
    const confirm = await question('\n⚠️  This will create REAL calendar events. Are you sure? (yes/no): ');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('\n❌ Cancelled.');
      rl.close();
      process.exit(0);
    }
  }

  // Authenticate (skip in dry run mode)
  let auth;
  if (!dryRun) {
    console.log('\n🔐 Authenticating with Google...');
    try {
      auth = await authorize();
    } catch (error) {
      console.error(`\n❌ Authentication failed: ${error.message}`);
      rl.close();
      process.exit(1);
    }
  }

  // Create events
  if (dryRun) {
    console.log('\n🧪 DRY RUN MODE - No events will be created');
  } else {
    console.log('\n📅 Creating calendar events...');
  }
  console.log('   This may take a few moments...\n');

  // Get calendar configuration from environment
  const reminderCalendarId = process.env.REMINDER_CALENDAR_ID;
  const retentionCalendarId = process.env.RETENTION_CALENDAR_ID;
  const enableAttendees = process.env.ENABLE_ATTENDEES === 'true';
  const attendeeEmail = process.env.PRODUCTION_ATTENDEE_EMAIL;

  // Show configuration
  console.log('📋 Configuration:');
  console.log(`   • Reminder Calendar: ${reminderCalendarId || 'Not set (using default)'}`);
  console.log(`   • Retention Calendar: ${retentionCalendarId || 'Not set (using default)'}`);
  console.log(`   • Attendees: ${enableAttendees ? `Enabled (${attendeeEmail})` : 'Disabled'}`);
  console.log('');

  try {
    const results = await createEventsFromCSV(auth, events, { 
      time, 
      dryRun,
      reminderCalendarId,
      retentionCalendarId,
      enableAttendees,
      attendeeEmail,
    });

    if (dryRun) {
      console.log('\n✅ Dry run complete!');
      console.log(`   • Would create: ${results.details.length} events`);
      console.log(`   • Reminder events: ${results.details.filter(d => d.calendarType === 'reminder').length}`);
      console.log(`   • Retention events: ${results.details.filter(d => d.calendarType === 'retention').length}`);
      console.log('\n   Sample events (first 5):');
      for (const detail of results.details.slice(0, 5)) {
        const timeStr = detail.time || time;
        console.log(`   • [${detail.date} ${timeStr}] ${detail.title} - Participant ${detail.participantId} (${detail.calendarType})`);
      }
    } else {
      console.log('\n✅ Import complete!');
      console.log(`   • Created: ${results.created}`);
      console.log(`   • Reminder events: ${results.reminderEvents}`);
      console.log(`   • Retention events: ${results.retentionEvents}`);
      console.log(`   • Skipped (already exist): ${results.skipped}`);
      console.log(`   • Errors: ${results.errors}`);
      if (enableAttendees) {
        console.log(`   • Attendees added: ${attendeeEmail}`);
      }
    }

    if (results.errors > 0) {
      console.log('\n❌ Errors encountered:');
      const errorDetails = results.details.filter(d => d.type === 'error');
      for (const detail of errorDetails.slice(0, 5)) {
        console.log(`   • Participant ${detail.participantId} - ${detail.title}: ${detail.error}`);
      }
      if (errorDetails.length > 5) {
        console.log(`   ... and ${errorDetails.length - 5} more errors`);
      }
    }

  } catch (error) {
    console.error(`\n❌ Error creating events: ${error.message}`);
    rl.close();
    process.exit(1);
  }

  rl.close();
}

main();

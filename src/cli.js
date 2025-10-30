#!/usr/bin/env node

import readline from 'readline';
import { authorize } from './auth.js';
import { createEvents, deleteEvents } from './calendar.js';

const DEFAULT_TIME = '09:00';

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Promisify readline question
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Validate date format (MM/DD/YYYY)
 */
function validateDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return false;
  
  const [, month, day, year] = match;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 2000 || y > 2100) return false;
  
  return true;
}

/**
 * Validate time format (HH:MM) with range 00:00 - 23:59
 */
function validateTime(timeStr) {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  
  const [, hour, minute] = match;
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  
  return true;
}

/**
 * Interactive CLI mode
 */
async function interactiveMode() {
  console.log('\n📅 Google Calendar Lab Invite Automation\n');
  console.log('This will create follow-up check-in events (1 day, 10 day, 45 day).\n');

  // Get base date
  let baseDate;
  while (true) {
    baseDate = await question('Enter base date (MM/DD/YYYY): ');
    if (validateDate(baseDate)) break;
    console.log('❌ Invalid date format. Use MM/DD/YYYY (e.g., 11/10/2025)');
  }

  // Get participant ID / title
  const title = await question('Enter participant ID or event name: ');
  if (!title) {
    console.log('❌ Title cannot be empty.');
    rl.close();
    process.exit(1);
  }

  // Get time (optional, default to 09:00)
  let time = DEFAULT_TIME;
  const timeInput = await question(`Enter start time (HH:MM) [default: ${DEFAULT_TIME}]: `);
  if (timeInput) {
    if (validateTime(timeInput)) {
      time = timeInput;
    } else {
      console.log(`❌ Invalid time format. Using default: ${DEFAULT_TIME}`);
    }
  }

  // Get attendee email
  const attendeeEmail = await question('Enter participant email: ');
  if (!attendeeEmail) {
    console.log('❌ Attendee email is required.');
    rl.close();
    process.exit(1);
  }

  // Confirm
  console.log('\n--- Summary ---');
  console.log(`Base date: ${baseDate}`);
  console.log(`Title: ${title}`);
  console.log(`Time: ${time}`);
  console.log(`Attendee: ${attendeeEmail}`);
  console.log('\nEvents to create:');
  console.log(`  - ${title} - 1 day check-in`);
  console.log(`  - ${title} - 10 day check-in`);
  console.log(`  - ${title} - 45 day check-in`);
  console.log();

  const confirm = await question('Create these events? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    process.exit(0);
  }

  // Authorize and create events
  console.log('\n🔐 Authorizing with Google Calendar...');
  const auth = await authorize();

  console.log('✅ Authorized! Creating events...\n');
  const results = await createEvents(auth, {
    baseDate,
    title,
    time,
    attendeeEmail,
    calendarId: 'primary',
    dryRun: false,
  });

  // Display results
  console.log('--- Results ---\n');
  for (const result of results) {
    if (result.type === 'created') {
      console.log(`✅ Created: ${result.title}`);
      console.log(`   Date: ${result.date}`);
      console.log(`   Link: ${result.htmlLink}\n`);
    } else if (result.type === 'skipped') {
      console.log(`⏭️  Skipped: ${result.title}`);
      console.log(`   Reason: ${result.reason}\n`);
    } else if (result.type === 'error') {
      console.log(`❌ Error: ${result.title}`);
      console.log(`   ${result.error}\n`);
    }
  }

  rl.close();
}

/**
 * Delete mode (CLI flag: --delete)
 */
async function deleteMode(baseDate, title, attendeeEmail) {
  console.log('\n🗑️  Delete mode\n');
  console.log(`Base date: ${baseDate}`);
  console.log(`Title: ${title}`);
  console.log(`Attendee: ${attendeeEmail}`);
  console.log('\nThis will delete all check-in events matching this base date, title, and attendee email.\n');

  const confirm = await question('Are you sure? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('Cancelled.');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔐 Authorizing with Google Calendar...');
  const auth = await authorize();

  console.log('✅ Authorized! Deleting events...\n');
  const results = await deleteEvents(auth, {
    baseDate,
    title,
    attendeeEmail,
    calendarId: 'primary',
  });

  // Display results
  console.log('--- Results ---\n');
  for (const result of results) {
    if (result.type === 'deleted') {
      console.log(`✅ Deleted: ${result.title}`);
      console.log(`   Event ID: ${result.eventId}\n`);
    } else if (result.type === 'not-found') {
      console.log(`⏭️  Not found: ${result.followUpType} check-in`);
      console.log(`   Key: ${result.eventKey}\n`);
    } else if (result.type === 'error') {
      console.log(`❌ Error: ${result.followUpType} check-in`);
      console.log(`   ${result.error}\n`);
    }
  }

  rl.close();
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Check for --delete flag
  if (args.includes('--delete')) {
    const dateIdx = args.indexOf('--date');
    const titleIdx = args.indexOf('--title');
    const emailIdx = args.indexOf('--email');

    if (dateIdx === -1 || titleIdx === -1 || emailIdx === -1 || 
        !args[dateIdx + 1] || !args[titleIdx + 1] || !args[emailIdx + 1]) {
      console.error('❌ Usage: node src/cli.js --delete --date MM/DD/YYYY --title "Title" --email "email@example.com"');
      process.exit(1);
    }

    const baseDate = args[dateIdx + 1];
    const title = args[titleIdx + 1];
    const attendeeEmail = args[emailIdx + 1];

    if (!validateDate(baseDate)) {
      console.error('❌ Invalid date format. Use MM/DD/YYYY');
      process.exit(1);
    }

    await deleteMode(baseDate, title, attendeeEmail);
  } else if (args.length === 0) {
    // Interactive mode
    await interactiveMode();
  } else {
    console.error('❌ Usage:');
    console.error('  Interactive mode: node src/cli.js');
    console.error('  Delete mode:      node src/cli.js --delete --date MM/DD/YYYY --title "Title" --email "email@example.com"');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});

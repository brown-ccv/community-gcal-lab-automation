import { parse } from 'csv-parse/sync';
import fs from 'fs';

/**
 * Column to event title mapping
 */
const COLUMN_TITLE_MAP = {
  B1STARTMIN10: 'BURST 1 Pre-BURST Checklist',
  B1STARTMIN1: 'BURST 1 1-Day Prior Reminder',
  B1STARTDATE: 'BURST 1 Start Date',
  B2STARTMIN10: 'BURST 2 Pre-BURST Checklist',
  B2STARTMIN1: 'BURST 2 1-Day Prior Reminder',
  B2STARTDATE: 'BURST 2 Start Date',
  B3STARTMIN10: 'BURST 3 Pre-BURST Checklist',
  B3STARTMIN1: 'BURST 3 1-Day Prior Reminder',
  B3STARTDATE: 'BURST 3 Start Date',
  B4STARTMIN10: 'BURST 4 Pre-BURST Checklist',
  B4STARTMIN1: 'BURST 4 1-Day Prior Reminder',
  B4STARTDATE: 'BURST 4 Start Date',
};

/**
 * Parse CSV file and extract events
 * @param {string} filePath - Path to CSV file
 * @returns {Array} Array of event objects
 */
export function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const events = [];

  for (const record of records) {
    // Only process Active participants
    if (record.IDSTATUS !== 'Active') {
      continue;
    }

    const participantId = record.ID;

    // Process each date column
    for (const [column, title] of Object.entries(COLUMN_TITLE_MAP)) {
      const dateValue = record[column];
      
      // Skip if date is empty
      if (!dateValue || dateValue.trim() === '') {
        continue;
      }

      events.push({
        participantId,
        title,
        date: dateValue.trim(),
        column, // Keep column name for tracking
      });
    }
  }

  return events;
}

/**
 * Parse CSV from buffer (for web uploads)
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Array} Array of event objects
 */
export function parseCSVFromBuffer(buffer) {
  const fileContent = buffer.toString('utf-8');
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const events = [];

  for (const record of records) {
    // Only process Active participants
    if (record.IDSTATUS !== 'Active') {
      continue;
    }

    const participantId = record.ID;

    // Process each date column
    for (const [column, title] of Object.entries(COLUMN_TITLE_MAP)) {
      const dateValue = record[column];
      
      // Skip if date is empty
      if (!dateValue || dateValue.trim() === '') {
        continue;
      }

      events.push({
        participantId,
        title,
        date: dateValue.trim(),
        column,
      });
    }
  }

  return events;
}

/**
 * Get summary of events by participant
 * @param {Array} events - Array of event objects
 * @returns {Object} Summary statistics
 */
export function getEventSummary(events) {
  const participants = new Set();
  const eventsByType = {};

  for (const event of events) {
    participants.add(event.participantId);
    
    if (!eventsByType[event.title]) {
      eventsByType[event.title] = 0;
    }
    eventsByType[event.title]++;
  }

  return {
    totalEvents: events.length,
    totalParticipants: participants.size,
    eventsByType,
  };
}

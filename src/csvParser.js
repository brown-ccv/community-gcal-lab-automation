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
 * Determine event type and calendar routing
 * @param {string} column - CSV column name
 * @returns {Object} - { type: 'reminder'|'retention'|'base', calendarType: 'reminder'|'retention'|null }
 */
function getEventMetadata(column) {
  // Base date columns (B2/B3/B4STARTDATE) are used for retention calculation only
  if (column === 'B2STARTDATE' || column === 'B3STARTDATE' || column === 'B4STARTDATE') {
    return { type: 'base', calendarType: null };
  }
  
  // MIN10 and MIN1 columns are reminder events
  if (column.includes('MIN')) {
    return { type: 'reminder', calendarType: 'reminder' };
  }
  
  // B1STARTDATE is the original base date (not used for retention)
  if (column === 'B1STARTDATE') {
    return { type: 'base', calendarType: null };
  }
  
  return { type: 'unknown', calendarType: null };
}

/**
 * Calculate retention date (45 days before base date)
 * @param {string} baseDateStr - Date in MM/DD/YYYY format
 * @returns {string|null} - Date in MM/DD/YYYY format, or null if invalid
 */
function calculateRetentionDate(baseDateStr) {
  try {
    // Parse MM/DD/YYYY
    const [month, day, year] = baseDateStr.split('/').map(s => parseInt(s.trim(), 10));
    
    // Validate date components
    if (isNaN(month) || isNaN(day) || isNaN(year)) {
      return null;
    }
    
    // Create date object (month is 0-indexed in JavaScript)
    const baseDate = new Date(year, month - 1, day);
    
    // Subtract 45 days
    baseDate.setDate(baseDate.getDate() - 45);
    
    // Format back to MM/DD/YYYY
    const retentionMonth = String(baseDate.getMonth() + 1).padStart(2, '0');
    const retentionDay = String(baseDate.getDate()).padStart(2, '0');
    const retentionYear = baseDate.getFullYear();
    
    return `${retentionMonth}/${retentionDay}/${retentionYear}`;
  } catch (error) {
    console.error(`Error calculating retention date from ${baseDateStr}:`, error);
    return null;
  }
}

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
  const retentionBaseDates = {}; // Store base dates for retention calculation

  for (const record of records) {
    // Only process Active participants
    if (record.IDSTATUS !== 'Active') {
      continue;
    }

    const participantId = record.ID;

    // First pass: collect base dates for retention events
    for (const baseColumn of ['B2STARTDATE', 'B3STARTDATE', 'B4STARTDATE']) {
      const baseDate = record[baseColumn];
      if (baseDate && baseDate.trim() !== '') {
        if (!retentionBaseDates[participantId]) {
          retentionBaseDates[participantId] = {};
        }
        retentionBaseDates[participantId][baseColumn] = baseDate.trim();
      }
    }

    // Second pass: process reminder events (dates from CSV)
    for (const [column, title] of Object.entries(COLUMN_TITLE_MAP)) {
      const dateValue = record[column];
      
      // Skip if date is empty
      if (!dateValue || dateValue.trim() === '') {
        continue;
      }

      const metadata = getEventMetadata(column);
      
      // Only process reminder events in this pass (skip base dates)
      if (metadata.type !== 'reminder') {
        continue;
      }

      events.push({
        participantId,
        title,
        date: dateValue.trim(),
        column,
        eventType: metadata.type,
        calendarType: metadata.calendarType,
      });
    }
  }

  // Third pass: create retention events based on base dates
  for (const [participantId, baseDates] of Object.entries(retentionBaseDates)) {
    for (const [baseColumn, baseDate] of Object.entries(baseDates)) {
      // Extract BURST number from column name (e.g., 'B2STARTDATE' -> '2')
      const burstNumber = baseColumn.charAt(1);
      
      // Calculate retention date (45 days before base date)
      const retentionDate = calculateRetentionDate(baseDate);
      
      if (retentionDate) {
        events.push({
          participantId,
          title: `BURST ${burstNumber} Retention Text`,
          date: retentionDate,
          column: baseColumn,
          eventType: 'retention',
          calendarType: 'retention',
          baseDate: baseDate, // Keep original base date for reference
        });
      }
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
  const retentionBaseDates = {}; // Store base dates for retention calculation

  for (const record of records) {
    // Only process Active participants
    if (record.IDSTATUS !== 'Active') {
      continue;
    }

    const participantId = record.ID;

    // First pass: collect base dates for retention events
    for (const baseColumn of ['B2STARTDATE', 'B3STARTDATE', 'B4STARTDATE']) {
      const baseDate = record[baseColumn];
      if (baseDate && baseDate.trim() !== '') {
        if (!retentionBaseDates[participantId]) {
          retentionBaseDates[participantId] = {};
        }
        retentionBaseDates[participantId][baseColumn] = baseDate.trim();
      }
    }

    // Second pass: process reminder events (dates from CSV)
    for (const [column, title] of Object.entries(COLUMN_TITLE_MAP)) {
      const dateValue = record[column];
      
      // Skip if date is empty
      if (!dateValue || dateValue.trim() === '') {
        continue;
      }

      const metadata = getEventMetadata(column);
      
      // Only process reminder events in this pass (skip base dates)
      if (metadata.type !== 'reminder') {
        continue;
      }

      events.push({
        participantId,
        title,
        date: dateValue.trim(),
        column,
        eventType: metadata.type,
        calendarType: metadata.calendarType,
      });
    }
  }

  // Third pass: create retention events based on base dates
  for (const [participantId, baseDates] of Object.entries(retentionBaseDates)) {
    for (const [baseColumn, baseDate] of Object.entries(baseDates)) {
      // Extract BURST number from column name (e.g., 'B2STARTDATE' -> '2')
      const burstNumber = baseColumn.charAt(1);
      
      // Calculate retention date (45 days before base date)
      const retentionDate = calculateRetentionDate(baseDate);
      
      if (retentionDate) {
        events.push({
          participantId,
          title: `BURST ${burstNumber} Retention Text`,
          date: retentionDate,
          column: baseColumn,
          eventType: 'retention',
          calendarType: 'retention',
          baseDate: baseDate, // Keep original base date for reference
        });
      }
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

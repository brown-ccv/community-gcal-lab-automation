# CSV Import Feature - Implementation Summary

## Overview
Added bulk CSV import functionality to create calendar events from FileMaker exports. Supports both CLI and web interface with demo mode.

## Features Implemented

### ✅ CSV Parser (`src/csvParser.js`)
- Parses FileMaker P16_FM_dates.csv format
- Filters for "Active" participants only
- Extracts 12 date columns per participant (B1-B4 × MIN10/MIN1/STARTDATE)
- Hardcoded column-to-title mapping:
  - `B1STARTMIN10` → "BURST 1 Pre-BURST Checklist"
  - `B1STARTMIN1` → "BURST 1 1-Day Prior Reminder"
  - `B1STARTDATE` → "BURST 1 Start Date"
  - (Same pattern for B2, B3, B4)
- Generates summary statistics (total events, participants, events by type)
- Supports both file path and buffer input

### ✅ Calendar Integration (`src/calendar.js`)
- New function: `createEventsFromCSV(auth, events, options)`
- Idempotency using key format: `participantId_date_column`
- No attendees (events created on calendar without invitations)
- Default: 9:00 AM start time, 30-minute duration
- Stores metadata in extended properties:
  - idempotencyKey
  - participantId
  - column (source column from CSV)
  - source: 'csv-import'
- Event title format: `"BURST X Title - Participant ID"`

### ✅ CLI Tool (`src/csvImport.js`)
- Command: `npm run csv-import`
- Interactive prompts for:
  - CSV file path (defaults to `src/data/P16_FM_dates.csv`)
  - Event time (defaults to 09:00)
  - Dry run mode (enabled by default)
  - Confirmation for real imports
- Shows summary before import:
  - Total participants
  - Total events
  - Breakdown by event type
- Displays results:
  - Created count
  - Skipped count (already exist)
  - Errors with details

### ✅ Web Interface
**New Page: `/csv-import.html`**
- Drag-and-drop file upload
- Manual file selection
- CSV validation (5MB limit, .csv extension required)
- Two-step process:
  1. Preview: Shows summary and sample events
  2. Import: Creates events after confirmation

**Features:**
- Summary statistics display
- Events by type breakdown
- Sample events preview (first 10)
- Time selector (default: 09:00)
- Demo mode support
- Link from main page: "📊 Bulk CSV Import →"

**API Endpoints:**
- `POST /api/csv/preview` - Parse and preview CSV
- `POST /api/csv/import` - Create events from CSV

### ✅ Demo Mode Support
- CLI: Skips authentication, shows "would create" summary
- Web: Simulates import, shows demo message
- Both maintain full UI/UX flow

## Configuration

### Event Settings
- **Time:** 9:00 AM (configurable)
- **Duration:** 30 minutes
- **Timezone:** America/New_York
- **Attendees:** None (calendar events only)

### CSV Format Requirements
```csv
ID,IDSTATUS,B1STARTMIN10,B1STARTMIN1,B1STARTDATE,...
"701","Active","8/5/2025","8/14/2025","8/15/2025",...
```

**Required Columns:**
- `ID` - Participant identifier
- `IDSTATUS` - Must be "Active" to process
- `B[1-4]STARTMIN10` - 10 days before BURST start
- `B[1-4]STARTMIN1` - 1 day before BURST start
- `B[1-4]STARTDATE` - BURST start date

## Usage

### CLI Usage
```bash
# Dry run (default)
npm run csv-import

# Follow prompts:
# 1. Enter CSV file path (or press Enter for default)
# 2. Enter event time (or press Enter for 09:00)
# 3. Choose dry run (yes) or real import (no)
# 4. Confirm if doing real import
```

### Web Usage
1. Navigate to http://localhost:3000
2. Click "📊 Bulk CSV Import →"
3. Upload or drag-drop CSV file
4. Review summary and sample events
5. Adjust event time if needed
6. Click "Create Events"

## Idempotency
- Events are not duplicated on re-import
- Unique key: `participantId_date_column`
- Example: `701_11-2-2025_B2STARTMIN10`
- Skipped events are counted and reported

## Error Handling
- Invalid CSV format → Clear error message
- File too large (>5MB) → Rejection with size limit
- Non-CSV file → Type validation error
- Authentication failure (CLI) → Detailed error message
- API errors → Displayed to user with context

## Testing
✅ Tested with sample file: `src/data/P16_FM_dates.csv`
- 4 participants (IDs: 701, 702, 703, 704)
- 48 total events (12 per participant)
- All "Active" status

## Dependencies Added
- `csv-parse`: ^6.1.0 - CSV parsing library
- `multer`: ^6.3.1 - File upload middleware for Express

## Files Created
- `src/csvParser.js` - CSV parsing logic
- `src/csvImport.js` - CLI tool
- `public/csv-import.html` - Web interface
- `public/csv-import-script.js` - Web interface JavaScript
- `docs/csv-import-qs.md` - Requirements documentation

## Files Modified
- `src/calendar.js` - Added `createEventsFromCSV()` function
- `src/server.js` - Added multer config and CSV endpoints
- `public/index.html` - Added link to CSV import page
- `package.json` - Added `csv-import` script

## Branch
- Feature branch: `csv-import-feature`
- Commits:
  1. `627e517` - Add CSV import feature with CLI tool
  2. `791fdaa` - Add web interface for CSV import

## Next Steps
- Test with real authentication (non-demo mode)
- Test with larger CSV files (multiple participants)
- Consider adding progress indicator for large imports
- Optional: Add export/download functionality for import results
- Optional: Add filtering options (select specific participants or date ranges)

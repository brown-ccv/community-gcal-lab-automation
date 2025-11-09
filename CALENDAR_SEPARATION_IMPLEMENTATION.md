# Calendar Separation Feature - Implementation Summary

## Overview
This document summarizes the implementation of the calendar separation feature, which splits events into two distinct calendars: **Reminder Calendar** and **Retention Calendar**.

## Implementation Date
November 9, 2025

## What Was Implemented

### 1. Environment Configuration (.env.example)
Added new environment variables:
- `REMINDER_CALENDAR_ID` - Calendar for BURST checklists and day-prior reminders
- `RETENTION_CALENDAR_ID` - Calendar for 45-day retention text events
- `PRODUCTION_ATTENDEE_EMAIL` - Email address to receive invitations (carelab@brown.edu)
- `ENABLE_ATTENDEES` - Boolean flag to control whether invitations are sent

**Safety Feature**: `ENABLE_ATTENDEES` defaults to `false` to prevent spam during development/testing.

### 2. CSV Parser Updates (src/csvParser.js)

#### New Functions
- `getEventMetadata(column)` - Determines event type and calendar routing
- `calculateRetentionDate(baseDateStr)` - Calculates retention date (45 days before base date)

#### Enhanced Parsing Logic
- **Three-pass parsing**:
  1. Collect base dates (B2/B3/B4 STARTDATE)
  2. Process reminder events (dates from CSV columns directly)
  3. Generate retention events (calculated as base date - 45 days)

#### New Event Properties
Each event now includes:
- `eventType`: `'reminder'` or `'retention'`
- `calendarType`: `'reminder'` or `'retention'`
- `baseDate`: Original base date (retention events only)

#### Supported CSV Columns
**Existing (BURST 1)**:
- B1STARTMIN10, B1STARTMIN1, B1STARTDATE

**New (BURST 2/3/4)**:
- B2STARTMIN10, B2STARTMIN1, B2STARTDATE
- B3STARTMIN10, B3STARTMIN1, B3STARTDATE
- B4STARTMIN10, B4STARTMIN1, B4STARTDATE

### 3. Calendar API Updates (src/calendar.js)

#### Enhanced `createEventsFromCSV()` Function
New parameters:
- `reminderCalendarId` - Target calendar for reminder events
- `retentionCalendarId` - Target calendar for retention events
- `enableAttendees` - Whether to add attendees to events
- `attendeeEmail` - Email address for attendees

#### Event Types
**Reminder Events** (9:00 AM - 9:30 AM):
- BURST 1-4 Pre-BURST Checklists (MIN10)
- BURST 1-4 1-Day Prior Reminders (MIN1)
- Uses `dateTime` format
- Dates read directly from CSV

**Retention Events** (All-day):
- BURST 2-4 Retention Text events
- Uses `date` format (no time)
- Dates calculated as base date - 45 days
- Created from B2/B3/B4 STARTDATE columns

#### Attendee Logic
```javascript
if (enableAttendees && attendeeEmail) {
  calendarEvent.attendees = [{ email: attendeeEmail }];
}
```
- Only adds attendees when `ENABLE_ATTENDEES=true` AND email is provided
- Uses `sendUpdates: 'all'` when attendees enabled, `'none'` otherwise

#### Enhanced Results Tracking
New result properties:
- `reminderEvents` - Count of reminder events created
- `retentionEvents` - Count of retention events created
- `calendarType` - Calendar routing for each event
- `hasAttendees` - Whether attendees were added

### 4. Server Updates (src/server.js)

#### CSV Import Route Enhancement
Reads environment variables and passes to `createEventsFromCSV()`:
```javascript
const reminderCalendarId = process.env.REMINDER_CALENDAR_ID;
const retentionCalendarId = process.env.RETENTION_CALENDAR_ID;
const enableAttendees = process.env.ENABLE_ATTENDEES === 'true';
const attendeeEmail = process.env.PRODUCTION_ATTENDEE_EMAIL;
```

Validation warnings:
- Warns if calendar IDs not set (falls back to default)
- Warns if attendees enabled but email not provided

### 5. CLI Tool Updates (src/csvImport.js)

#### Configuration Display
Shows current configuration before import:
```
📋 Configuration:
   • Reminder Calendar: your-calendar-id@group.calendar.google.com
   • Retention Calendar: your-calendar-id@group.calendar.google.com
   • Attendees: Enabled (carelab@brown.edu)
```

#### Enhanced Results Display
- Shows reminder vs retention event counts
- Displays calendar type for each event
- Shows attendee information when enabled

## Event Summary

### Total Events per Participant
- **8 Reminder Events**: BURST 1-4 (MIN10 + MIN1 each)
- **3 Retention Events**: BURST 2-4 (45 days before base date)
- **Total**: 11 events per participant

### Date Calculation Logic
| Event Type | Date Source | Calculation |
|------------|-------------|-------------|
| Reminder (MIN10/MIN1) | CSV Column | **None** - used directly |
| Retention | Base Date | **baseDate - 45 days** |

### Weekend Shifting
Both reminder and retention events apply weekend shifting:
- Saturday → Friday
- Sunday → Friday

## Configuration Guide

### Step 1: Set Up Calendars in Google Calendar
1. Create "Reminder Calendar" in Google Calendar
2. Create "Retention Calendar" in Google Calendar
3. Share both with service account (from credentials.json)
4. Grant "Make changes to events" permission

### Step 2: Get Calendar IDs
1. Go to Calendar Settings
2. Click "Integrate calendar" section
3. Copy "Calendar ID" (format: `name@group.calendar.google.com`)
4. **Important**: Use Calendar ID, NOT the secret iCal URL

### Step 3: Update .env File
```bash
# Calendar IDs
REMINDER_CALENDAR_ID=your-reminder-calendar-id@group.calendar.google.com
RETENTION_CALENDAR_ID=your-retention-calendar-id@group.calendar.google.com

# Attendee Configuration
PRODUCTION_ATTENDEE_EMAIL=carelab@brown.edu
ENABLE_ATTENDEES=false  # Set to true in production
```

### Step 4: Testing (Development)
```bash
# Make sure ENABLE_ATTENDEES=false in .env
npm start

# Upload CSV and verify:
# - Events created on correct calendars
# - No attendees added
# - Retention events are all-day
# - Reminder events are 9:00-9:30 AM
```

### Step 5: Production Deployment
```bash
# Set in production .env or environment variables:
ENABLE_ATTENDEES=true
PRODUCTION_ATTENDEE_EMAIL=carelab@brown.edu
```

## Safety Features

### 1. Default to Safe Mode
`ENABLE_ATTENDEES` defaults to `false` to prevent accidental spam during development.

### 2. Validation Warnings
- Warns if calendar IDs missing
- Warns if attendees enabled but email not set
- Falls back to default calendar if routing fails

### 3. Idempotency
Events use unique keys including:
- Participant ID
- Date
- CSV column name

Prevents duplicate events even across multiple imports.

### 4. Demo Mode Compatible
All features work with `DEMO_MODE=true` for testing without real API calls.

## Testing Checklist

- [ ] Environment variables set in `.env`
- [ ] Both calendars created and shared with service account
- [ ] `ENABLE_ATTENDEES=false` for initial testing
- [ ] CSV import creates reminder events on reminder calendar
- [ ] CSV import creates retention events on retention calendar
- [ ] Retention events are all-day (no time)
- [ ] Reminder events are 9:00-9:30 AM
- [ ] Retention dates are 45 days before base date
- [ ] Weekend shifting works for both event types
- [ ] No attendees added when `ENABLE_ATTENDEES=false`
- [ ] Attendees added when `ENABLE_ATTENDEES=true`
- [ ] Idempotency prevents duplicate events
- [ ] Results show correct event type counts

## Files Modified

### Core Implementation
- `src/csvParser.js` - Enhanced parsing with retention calculation
- `src/calendar.js` - Multi-calendar support, attendee logic, all-day events
- `src/server.js` - Environment variable handling, validation
- `src/csvImport.js` - CLI configuration display, enhanced results

### Documentation
- `.env.example` - New calendar and attendee variables
- `docs/different_calendars/diff_calendar_design.md` - Design specification
- `CALENDAR_SEPARATION_IMPLEMENTATION.md` - This file

## Known Limitations

1. **BURST 1 Events**: Currently not migrated to new calendar structure (backward compatibility)
2. **Manual Entry**: May not support BURST 2/3/4 (CSV-only feature initially)
3. **Calendar Fallback**: If calendar IDs not set, uses default calendar for all events

## Future Enhancements

- Migrate BURST 1 events to new calendar structure
- Add UI to preview calendar routing before import
- Support configurable retention offset (not hardcoded to 45 days)
- Add calendar selection in manual entry mode
- Bulk calendar migration tool (move existing events between calendars)

## Support

For issues or questions:
1. Check `.env` configuration matches `.env.example`
2. Verify calendar IDs are from "Integrate calendar" section (not iCal URLs)
3. Ensure service account has access to both calendars
4. Check console warnings for configuration issues

---

**Implementation Status**: ✅ Complete  
**Branch**: `different-calendars`  
**Ready for Testing**: Yes  
**Ready for Production**: After testing with `ENABLE_ATTENDEES=false`

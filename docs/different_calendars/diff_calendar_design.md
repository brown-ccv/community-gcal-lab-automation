# Different Calendars Implementation Design

## Overview

This document outlines the plan to separate calendar events into two distinct calendars:
1. **Reminder Calendar** - For BURST checklists and day-prior reminders
2. **Retention Calendar** - For 45-day retention text reminders

All events will be posted to shared calendars without individual attendees to avoid spam during testing.

---

## Current State

### Existing Event Types (BURST 1)
- **BURST 1 Pre-BURST Checklist** (B1STARTMIN10)
- **BURST 1 1-Day Prior Reminder** (B1STARTMIN1)
- Base Date: **B1STARTDATE**

### Current Configuration
- Events created on single calendar (`CALENDAR_ID`)
- Individual attendee specified per event
- Time: Hardcoded to 9:00 AM - 9:30 AM

---

## Proposed Changes

### New Event Types to Add

#### Reminder Events (BURST 2, 3, 4)
All posted to **Reminder Calendar** (`REMINDER_CALENDAR_ID`)

**BURST 2:**
1. BURST 2 Pre-BURST Checklist - **B2STARTMIN10** (date from CSV)
2. BURST 2 1-Day Prior Reminder - **B2STARTMIN1** (date from CSV)

**BURST 3:**
3. BURST 3 Pre-BURST Checklist - **B3STARTMIN10** (date from CSV)
4. BURST 3 1-Day Prior Reminder - **B3STARTMIN1** (date from CSV)

**BURST 4:**
5. BURST 4 Pre-BURST Checklist - **B4STARTMIN10** (date from CSV)
6. BURST 4 1-Day Prior Reminder - **B4STARTMIN1** (date from CSV)

**Event Details:**
- **Time**: 9:00 AM - 9:30 AM (30 minutes)
- **Invitees**: `carelab@brown.edu` (production only)
- **Calendar**: Reminder Calendar
- **Date Logic**: Dates are read directly from CSV columns (no calculation needed)

#### Retention Events (NEW)
All posted to **Retention Calendar** (`RETENTION_CALENDAR_ID`)

1. **BURST 2 Retention Text**
   - **Date**: 45 days **before** B2STARTDATE (calculated from CSV)
   
2. **BURST 3 Retention Text**
   - **Date**: 45 days **before** B3STARTDATE (calculated from CSV)
   
3. **BURST 4 Retention Text**
   - **Date**: 45 days **before** B4STARTDATE (calculated from CSV)

**Event Details:**
- **Time**: All-day event (no specific time)
- **Invitees**: `carelab@brown.edu` (production only)
- **Calendar**: Retention Calendar
- **Date Logic**: Calculate 45 days **before** the base date from CSV

---

## Environment Configuration

### .env Variables

```env
# Reminder Calendar - for BURST checklists and day-prior reminders
REMINDER_CALENDAR_ID=your-reminder-calendar-id@group.calendar.google.com

# Retention Calendar - for 45-day retention text events
RETENTION_CALENDAR_ID=your-retention-calendar-id@group.calendar.google.com

# Production attendee email (leave empty for testing to avoid spam)
PRODUCTION_ATTENDEE_EMAIL=carelab@brown.edu

# Set to 'true' to enable sending invites to PRODUCTION_ATTENDEE_EMAIL
ENABLE_ATTENDEES=false
```

### Behavior

**During Development/Testing (`ENABLE_ATTENDEES=false`):**
- Events created without attendees
- No email invitations sent
- Safe to test without spamming carelab@brown.edu

**In Production (`ENABLE_ATTENDEES=true`):**
- Events created with `carelab@brown.edu` as attendee
- Email invitations sent to carelab inbox
- Real operational mode

---

## Event Type Summary

### Complete Event List

| Event Name | Calendar | CSV Column | Date Logic | Duration | Invitee (Prod) |
|------------|----------|------------|------------|----------|----------------|
| BURST 1 Pre-BURST Checklist | Reminder | B1STARTMIN10 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 1 1-Day Prior Reminder | Reminder | B1STARTMIN1 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 2 Pre-BURST Checklist | Reminder | B2STARTMIN10 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 2 1-Day Prior Reminder | Reminder | B2STARTMIN1 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 3 Pre-BURST Checklist | Reminder | B3STARTMIN10 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 3 1-Day Prior Reminder | Reminder | B3STARTMIN1 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 4 Pre-BURST Checklist | Reminder | B4STARTMIN10 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 4 1-Day Prior Reminder | Reminder | B4STARTMIN1 | Direct from CSV | 9:00-9:30 AM | carelab@brown.edu |
| BURST 2 Retention Text | Retention | B2STARTDATE | B2STARTDATE - 45 days | All-day | carelab@brown.edu |
| BURST 3 Retention Text | Retention | B3STARTDATE | B3STARTDATE - 45 days | All-day | carelab@brown.edu |
| BURST 4 Retention Text | Retention | B4STARTDATE | B4STARTDATE - 45 days | All-day | carelab@brown.edu |

### Base Dates
- **B1STARTDATE** - Used for BURST 1 (existing, not in CSV - manually entered)
- **B2STARTDATE** - BURST 2 base date (from CSV, only used to calculate retention date)
- **B3STARTDATE** - BURST 3 base date (from CSV, only used to calculate retention date)
- **B4STARTDATE** - BURST 4 base date (from CSV, only used to calculate retention date)

---

## Implementation Plan

### Phase 1: Environment Setup
1. ✅ Add calendar ID environment variables to `.env`
2. ✅ Add attendee configuration variables
3. ✅ Update `.env.example` with documentation
4. Document design (this file)

### Phase 2: Code Changes

#### 2.1 Update `src/calendar.js`
- Add support for multiple calendars (reminder vs retention)
- Add conditional attendee logic based on `ENABLE_ATTENDEES`
- Add new event types for BURST 2, 3, 4 reminder events
- Add retention event creation function (all-day events)
- Implement 45-day offset calculation for retention events only
- **No date calculations for reminder events** - dates come directly from CSV

#### 2.2 Update `src/csvParser.js`
- Parse new CSV columns: B2STARTMIN10, B2STARTMIN1, B3STARTMIN10, B3STARTMIN1, B4STARTMIN10, B4STARTMIN1
- Parse B2STARTDATE, B3STARTDATE, B4STARTDATE columns (for retention calculation only)
- Validate new date columns
- **All reminder event dates are used as-is from CSV**
- **Base dates (B2/B3/B4STARTDATE) only used to calculate retention dates**

#### 2.3 Update Manual Entry (if needed)
- Consider if manual entry needs BURST 2/3/4 support
- May only be needed for CSV import

#### 2.4 Update Event Reporting
- Show which calendar each event was created on
- Indicate whether attendees were added
- Show retention events separately in reports

### Phase 3: Testing Strategy

#### Development Testing (`ENABLE_ATTENDEES=false`)
1. Test BURST 1 events (existing) - verify still works
2. Test BURST 2 events - verify dates and calendar routing
3. Test BURST 3 events - verify dates and calendar routing
4. Test BURST 4 events - verify dates and calendar routing
5. Test retention events - verify 45-day offset and all-day format
6. Verify no attendees added
7. Verify events appear on correct calendars

#### Production Testing (`ENABLE_ATTENDEES=true`)
1. Test with single participant first
2. Verify carelab@brown.edu receives invitations
3. Verify invitation content and formatting
4. Full CSV import test with small batch

### Phase 4: Deployment
1. Create/configure reminder calendar in Google Calendar
2. Create/configure retention calendar in Google Calendar
3. Share both calendars with service account
4. Update production `.env` with calendar IDs
5. Set `ENABLE_ATTENDEES=true` in production
6. Deploy and monitor

---

## Technical Considerations

### All-Day Events
Retention events are all-day events. Google Calendar API requires:
```javascript
{
  start: {
    date: '2025-11-15'  // YYYY-MM-DD format (no time)
  },
  end: {
    date: '2025-11-15'  // Same day
  }
  // No dateTime field
}
```

### Negative Date Offsets
Retention events are 45 days **before** base date (only calculation needed):
```javascript
// If B2STARTDATE is 12/30/2025
// Retention event should be 11/15/2025 (45 days earlier)
const retentionDate = new Date(baseDate);
retentionDate.setDate(retentionDate.getDate() - 45);
```

**Important**: This calculation is ONLY for retention events. All reminder event dates (B1/B2/B3/B4STARTMIN10 and STARTMIN1) are used directly from the CSV without any calculation.

### Event Title Format
**Reminder Events:**
- Format: `{ParticipantID} - BURST {N} Pre-BURST Checklist`
- Example: `701 - BURST 2 Pre-BURST Checklist`

**Retention Events:**
- Format: `{ParticipantID} - BURST {N} Retention Text`
- Example: `701 - BURST 2 Retention Text`

### Weekend Shifting
- **Reminder events**: Apply existing weekend shift logic (Sat→Fri, Sun→Fri)
- **Retention events**: TBD - should all-day events also shift? (Recommend: Yes, for consistency)

---

## Security & Safety

### Preventing Email Spam During Testing
- **Never set `ENABLE_ATTENDEES=true` in development**
- Default to `false` in `.env.example`
- Add warning comments in code
- Consider runtime check to prevent accidental enabling

### Calendar Access
- Both calendars must be shared with service account
- Service account needs "Make changes to events" permission
- Verify permissions before deployment

### Idempotency
- Extend existing event key system to include:
  - BURST number (1, 2, 3, 4)
  - Event type (checklist, reminder, retention)
- Prevent duplicate event creation across calendars

---

## Future Enhancements (Optional)

- Add UI to show which calendar events will be posted to
- Add calendar selection in manual entry mode
- Support additional event types per BURST
- Configurable retention offset (not hardcoded to 45 days)
- Bulk calendar switching (move events between calendars)

---

## Notes

- BURST 1 events remain unchanged (backward compatibility)
- CSV format must include new columns for BURST 2/3/4
- Manual entry may not support BURST 2/3/4 initially (CSV-only feature)
- Attendee email will only be added when `ENABLE_ATTENDEES=true`
- Production deployment requires careful testing before enabling attendees

---

**Status**: 📝 Design phase  
**Next Step**: Implement Phase 2 (Code Changes)  
**Target**: Support BURST 2/3/4 reminder and retention events on separate calendars
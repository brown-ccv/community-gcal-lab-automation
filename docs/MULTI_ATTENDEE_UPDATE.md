# Multi-Attendee Support Update

## Overview
Updated the idempotency system to allow creating identical check-in events for different attendees. Previously, the system would prevent duplicate events based only on `baseDate + title + followUpType`. Now it includes `attendeeEmail` in the uniqueness check.

## What Changed

### Core Logic (`src/calendar.js`)
- **`buildEventKey()` function**: Now includes `attendeeEmail` parameter
  - Old format: `"2025-11-10_ParticipantID_10day"`
  - New format: `"2025-11-10_ParticipantID_10day_attendee@email.com"`
  - Email is sanitized (lowercase, special chars replaced with underscores)

- **Event extended properties**: Now stores `attendeeEmail` in metadata
  ```javascript
  extendedProperties: {
    private: {
      eventKey: '...',
      baseDate: '...',
      followUpType: '...',
      attendeeEmail: 'participant@example.com'  // NEW
    }
  }
  ```

- **`deleteEvents()` function**: Legacy note from the earlier implementation; signature-based deletion has since been removed in favor of manual deletion and batch undo

### Web Interface
- **`public/index.html`**: The old delete form is no longer present
  - Deletions are now handled manually in Google Calendar
  - The app keeps an undo action for the most recent create/import batch

- **`public/script.js`**: The old delete form handler was removed
  - The UI now exposes only batch undo for recent create/import actions

- **`src/server.js`**: The `/delete-events` endpoint was removed
  - Batch undo is now handled by `/api/undo-last-creation`

### CLI
- **`src/cli.js`**: Delete mode was removed
  - The CLI now focuses on event creation only

## Use Cases Now Supported

### ✅ Different participants, same event series
Create check-ins for multiple participants on the same date:
```bash
# Create events for Alice
POST /create-events
{
  "baseDate": "11/10/2025",
  "title": "BURST-001",
  "time": "09:00",
  "attendeeEmail": "alice@example.com"
}

# Create events for Bob (same date/title, different email)
POST /create-events
{
  "baseDate": "11/10/2025",
  "title": "BURST-001",
  "time": "09:00",
  "attendeeEmail": "bob@example.com"
}
```

Both will succeed and create separate event series!

### ✅ Targeted cleanup
Delete only specific participant's events manually in Google Calendar when needed, or use the batch undo action immediately after a create/import run.

## Migration Notes
- **No breaking changes**: Existing events still work
- **No database migration needed**: Changes are in idempotency key logic only
- **Backward compatibility**: Old events without `attendeeEmail` in extended properties will still be found (won't match new events)

## Testing Checklist
- [ ] Create events for two different emails with same baseDate/title
- [ ] Verify both event series appear in calendar
- [ ] Delete one participant's events, verify other remains
- [ ] Verify the batch undo action only removes the most recent create/import batch
- [ ] Test edge case: same email, different titles (should work)

## Documentation Updates Needed
- [x] Update CLI usage examples in README
- [x] Update web form instructions
- [x] Add this migration document
- [ ] Update CUSTOMIZATION.md examples
- [ ] Update WEB_USER_GUIDE.md with email requirement

## Next Steps
1. Test the full flow (create → verify → delete → verify)
2. Update user-facing documentation
3. Consider adding email validation in CLI interactive mode
4. Consider adding "list events by email" feature for debugging

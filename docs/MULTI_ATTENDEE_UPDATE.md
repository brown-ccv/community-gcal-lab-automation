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

- **`deleteEvents()` function**: Now requires `attendeeEmail` parameter to match the correct events

### Web Interface
- **`public/index.html`**: Added attendee email field to delete form
  - Delete form now requires: base date, title, AND email
  - Help text explains: "Must match the email used when creating the events"

- **`public/script.js`**: Updated delete form handler
  - Validates email presence before submission
  - Passes `attendeeEmail` to `/delete-events` endpoint
  - Confirmation dialog now shows email: `"${title}" (${attendeeEmail})`

- **`src/server.js`**: Updated `/delete-events` endpoint
  - Now requires `attendeeEmail` in request body
  - Validates email format with regex
  - Returns 400 error if email missing or invalid

### CLI
- **`src/cli.js`**: Updated delete mode
  - `deleteMode()` now accepts `attendeeEmail` parameter
  - Usage updated: `--delete --date MM/DD/YYYY --title "Title" --email "email@example.com"`
  - Requires `--email` flag for delete operations

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

### ✅ Targeted deletion
Delete only specific participant's events:
```bash
# Only deletes Alice's events, leaves Bob's intact
POST /delete-events
{
  "baseDate": "11/10/2025",
  "title": "BURST-001",
  "attendeeEmail": "alice@example.com"
}
```

## Migration Notes
- **No breaking changes**: Existing events still work
- **No database migration needed**: Changes are in idempotency key logic only
- **Backward compatibility**: Old events without `attendeeEmail` in extended properties will still be found (won't match new events)

## Testing Checklist
- [ ] Create events for two different emails with same baseDate/title
- [ ] Verify both event series appear in calendar
- [ ] Delete one participant's events, verify other remains
- [ ] Test CLI delete with `--email` flag
- [ ] Verify web form requires email for deletion
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

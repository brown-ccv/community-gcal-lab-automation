## Why

The Google Calendar Lab Automation project currently lacks formal OpenSpec specifications. Defining these specifications will document the existing features, expected behaviors, and verification rules for the whole project, providing a clear contract for future feature development and maintenance.

## What Changes

- Introduce formal OpenSpec specifications under `openspec/specs/` covering the core features of the project.
- Model the behaviors of event scheduling, CSV processing, user authentication/bypass, and the developer/admin CLI interface.
- No implementation source code will be modified during this change, as the goal is to document existing behaviors.

## Capabilities

### New Capabilities
- `event-automation`: Batch calendar event creation at specific offsets (1 day, 10 days, 45 days) from a base date, timezone configuration, attendee invitation, and metadata-based idempotency/cleanup.
- `csv-import`: Parser and processor for FileMaker CSV exports containing multi-burst scheduling dates for active participants.
- `user-auth`: Google OAuth 2.0 user authentication flow for access control, with Bypass and Demo modes for development/demonstration.
- `cli-interface`: Command-line tools for manual testing, viewing events, and deleting automated events.

### Modified Capabilities

## Impact

- **Affected code**: No functional code is affected; this change is documentation-only.
- **APIs**: Documents Google Calendar API usage patterns (service accounts, event details, private properties).
- **Testing**: Establishes test cases and validation conditions for existing features.

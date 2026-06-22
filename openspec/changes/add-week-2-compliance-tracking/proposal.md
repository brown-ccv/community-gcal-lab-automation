## Why

The Google Calendar Lab Automation project needs to track lab participant compliance at the end of the 14-day burst window. Adding a Week 2 Compliance Tracking event will help administrators monitor and log compliance status.

## What Changes

- Add logic to calculate compliance event dates on Day 15 (base date + 14 days) for all four bursts.
- Implement a custom weekend-shifting strategy specifically for compliance events, where weekend dates are moved to the following Monday.
- Configure compliance events as all-day events and route them to the Retention Calendar.

## Capabilities

### New Capabilities

### Modified Capabilities
- `event-automation`: Add calculations for Week 2 Compliance Tracking events, custom weekend shifting rules (Saturday/Sunday -> Monday), and all-day configurations for these events.

## Impact

- **Affected code**: `src/csvParser.js` (for parsing B1-B4 dates and calculating compliance dates) and `src/calendar.js` (for handling compliance weekend shifts and creating all-day events on the retention calendar).
- **APIs**: Inserts new all-day events into the Retention Calendar.

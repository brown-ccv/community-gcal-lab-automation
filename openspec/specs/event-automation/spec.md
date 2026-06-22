# Event Automation

## Purpose

Automate the creation of follow-up check-in calendar events for lab participants in both manual entry and bulk CSV import flows, ensuring weekday compliance and idempotency.

## Requirements

### Requirement: Event Scheduling Intervals
The system SHALL automatically schedule follow-up check-in events at 1 day, 10 days, and 45 days offsets from the provided base date.

#### Scenario: Interval event offsets
- **WHEN** events are scheduled with base date 10/01/2025
- **THEN** check-in events are calculated for 10/02/2025 (1 day), 10/11/2025 (10 days), and 11/15/2025 (45 days)

### Requirement: Weekend Shift
The system SHALL automatically shift scheduled events that fall on a weekend to the nearest weekday. If the event date falls on a Saturday, it SHALL shift to Friday. If it falls on a Sunday, it SHALL shift to Monday.

#### Scenario: Saturday shifting
- **WHEN** a calculated event date is a Saturday (e.g., 10/04/2025)
- **THEN** the system shifts the event date to Friday (10/03/2025)

#### Scenario: Sunday shifting
- **WHEN** a calculated event date is a Sunday (e.g., 10/05/2025)
- **THEN** the system shifts the event date to Monday (10/06/2025)

### Requirement: Event Creation Idempotency
The system SHALL verify if an event already exists using a unique event key in the event's private extended properties (`extendedProperties.private.eventKey`) before executing the Google Calendar insert API. If a matching event key is found, the system SHALL skip creating that event.

#### Scenario: Skipped duplicate creation
- **WHEN** an event with key `11-10-2025_BURST-001_10day` is requested and already exists
- **THEN** the system skips creation of the event and logs it as skipped

### Requirement: Event Properties
Each created check-in event MUST be scheduled for 30 minutes in the `America/New_York` timezone, contain no default reminders, and include the participant email as an attendee.

#### Scenario: Event resource schema check
- **WHEN** the Google Calendar API client constructs the insert request
- **THEN** the request contains the proper summary, timezone, duration, and empty reminders override list

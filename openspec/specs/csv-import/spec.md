# CSV Import

## Purpose

Support parsing of FileMaker CSV participant exports to schedule multi-burst calendar reminder and retention events in bulk across distinct designated calendars.

## Requirements

### Requirement: FileMaker CSV Parsing
The system SHALL parse standard FileMaker CSV files containing headers for participant `ID`, status `IDSTATUS`, and multiple burst columns (e.g., `B1STARTMIN10`, `B1STARTMIN1`, `B1STARTDATE`).

#### Scenario: Parse valid CSV payload
- **WHEN** a valid FileMaker CSV file is uploaded to the backend
- **THEN** the system parses the CSV rows and maps the burst date columns to event dates

### Requirement: Filter Active ID Status
The system SHALL only schedule events for participants whose `IDSTATUS` column is set to "Active".

#### Scenario: Ignore inactive participant records
- **WHEN** the CSV parser encounters a row where `IDSTATUS` is not "Active"
- **THEN** no events are created or scheduled for that participant

### Requirement: Multiple Burst Columns Scheduling
The system SHALL schedule events for all active burst columns present in the CSV file, routing them to the correct calendar based on event type (e.g., reminder or retention).

#### Scenario: Route events to designated calendars
- **WHEN** events are scheduled via CSV import
- **THEN** the system checks if the event is a reminder or retention event and routes it to `REMINDER_CALENDAR_ID` or `RETENTION_CALENDAR_ID` respectively

### Requirement: Calendar-Only Events
Events created via CSV import SHALL NOT invite any attendees by default, unless attendee support is explicitly enabled via the system configuration (`ENABLE_ATTENDEES=true`).

#### Scenario: No attendee invitation on bulk import
- **WHEN** a bulk CSV import is executed with attendees disabled
- **THEN** the created events do not list any attendees or send invitations

### Requirement: Active Date Calculations Reference Panel
The system SHALL display a collapsible reference panel on the frontend, positioned under the CSV upload area, which outlines all active date calculation formulas, column mappings, and weekend-shifting rules.

#### Scenario: Toggle date calculations panel
- **WHEN** the user clicks the "View Active Date Calculation Rules & Formulas" accordion header
- **THEN** the panel expands or collapses to reveal or hide the rules guide

#### Scenario: Display active rules in reference panel
- **WHEN** the rules guide is expanded
- **THEN** it displays the mapping columns (B[1-4]STARTMIN10, B[1-4]STARTMIN1, B[2-4]STARTDATE, B[1-4]STARTDATE), the respective formulas (e.g., minus 45 days, plus 14 days), the weekend-shifting directions, and the relevant bursts (e.g., Bursts 1–4 or Bursts 2–4) for each event type, while omitting any time or timezone details

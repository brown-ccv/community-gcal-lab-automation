## ADDED Requirements

### Requirement: Compliance Event Scheduling
The system SHALL calculate and schedule "Week 2 Compliance Tracking" events on Day 15 of the burst (base date + 14 days) for all four bursts when processing active participant records.

#### Scenario: Calculate compliance event date
- **WHEN** a burst start date is 10/01/2025
- **THEN** the compliance event date is calculated as 10/15/2025

### Requirement: Compliance Weekend Shifting
If a compliance event falls on a Saturday or a Sunday, the system SHALL shift the event date to the following Monday.

#### Scenario: Saturday compliance shift to Monday
- **WHEN** a compliance event date is Saturday (e.g., 10/04/2025)
- **THEN** the event is shifted to Monday (10/06/2025)

#### Scenario: Sunday compliance shift to Monday
- **WHEN** a compliance event date is Sunday (e.g., 10/05/2025)
- **THEN** the event is shifted to Monday (10/06/2025)

### Requirement: Compliance Event Format and Routing
Each Week 2 Compliance Tracking event SHALL be configured as an all-day event and routed to the Retention Calendar.

#### Scenario: Compliance event format and routing checks
- **WHEN** a compliance event is inserted
- **THEN** it has start and end properties defined by date (no time) and is routed to the Retention Calendar ID

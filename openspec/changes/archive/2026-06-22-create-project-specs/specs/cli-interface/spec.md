## ADDED Requirements

### Requirement: Interactive Inputs
The CLI tool SHALL prompt the user interactively to obtain the base date, participant ID/event title, start time (defaulting to `09:00`), and participant email.

#### Scenario: Prompt user for event details
- **WHEN** the user executes the CLI command without arguments
- **THEN** the CLI displays questions for date, title, time, and email sequentially

### Requirement: Input Format Validation
The CLI SHALL validate input date formats to ensure they match `MM/DD/YYYY` and validate times to ensure they match `HH:MM` within a 24-hour range.

#### Scenario: Re-prompt on invalid date format
- **WHEN** the user inputs `2025-11-10` as the base date
- **THEN** the CLI displays a validation warning and prompts for the base date again

### Requirement: Event Creation and Reporting
The CLI SHALL request confirmation from the user before executing calendar writes, and then display a formatted summary of results indicating whether each event was created, skipped, or failed.

#### Scenario: Output results after confirming creation
- **WHEN** the user inputs `yes` to confirm event scheduling
- **THEN** the CLI outputs execution logs for the 1-day, 10-day, and 45-day check-in events

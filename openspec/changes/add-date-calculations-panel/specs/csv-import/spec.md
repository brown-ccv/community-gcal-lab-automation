## ADDED Requirements

### Requirement: Active Date Calculations Reference Panel
The system SHALL display a collapsible reference panel on the frontend, positioned under the CSV upload area, which outlines all active date calculation formulas, column mappings, and weekend-shifting rules.

#### Scenario: Toggle date calculations panel
- **WHEN** the user clicks the "View Active Date Calculation Rules & Formulas" accordion header
- **THEN** the panel expands or collapses to reveal or hide the rules guide

#### Scenario: Display active rules in reference panel
- **WHEN** the rules guide is expanded
- **THEN** it displays the mapping columns (B[1-4]STARTMIN10, B[1-4]STARTMIN1, B[2-4]STARTDATE, B[1-4]STARTDATE), the respective formulas (e.g., minus 45 days, plus 14 days), the weekend-shifting directions, and the relevant bursts (e.g., Bursts 1–4 or Bursts 2–4) for each event type, while omitting any time or timezone details

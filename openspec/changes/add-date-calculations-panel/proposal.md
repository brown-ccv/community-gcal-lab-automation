## Why

Administrators currently lack immediate visibility and transparency into the system's date calculation formulas, offsets, and custom weekend-shifting rules when using the CSV import interface. Adding a collapsible reference panel directly on the frontend will provide administrators with a clear, concise guide to the active calculation logic, improving confidence before committing bulk event creations without cluttering the main preview layout.

## What Changes

- Add a collapsible details panel on the frontend (`public/index.html`) that displays the active date calculation rules, formulas, and weekend-shifting directions.
- Style the collapsible accordion in `public/styles.css` using modern, responsive design tokens with clear visual indicators for reminder and retention calendar types.
- Ensure the time and timezone references are omitted since all target users operate in the Eastern Time Zone (EST/EDT).

## Capabilities

### New Capabilities

*None.*

### Modified Capabilities

- `csv-import`: Add a spec-level requirement for the user interface to display a collapsible guide of active date calculation rules and weekend-shifting formulas.

## Impact

- **Affected Files**: `public/index.html` (add accordion structure), `public/styles.css` (add accordion styles).
- **APIs & Backend**: No impact. This is a purely frontend reference feature that describes the existing logic.

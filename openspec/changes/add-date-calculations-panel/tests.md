## Automated Tests

- `npm test`: Verifies that all 39 existing unit and integration tests (including CSV parser mappings, calendar operations, and server endpoints) pass successfully, ensuring zero backend regressions.

## Manual Verification

- **Collapsible Reference Accordion Visual Layout & Styling**:
  - **WHEN** the dashboard page loads in the browser
  - **THEN** a styled details panel titled "View Active Date Calculation Rules & Formulas" is visible directly below the CSV file upload dropzone, matching the project's typography and containing no emojis
- **Accordion Toggle Behavior**:
  - **WHEN** the user clicks the "View Active Date Calculation Rules & Formulas" accordion header
  - **THEN** the panel expands smoothly to display the rules list, and collapses cleanly when clicked again
- **Calculation Rules Accuracy & Presentation**:
  - **WHEN** the accordion is expanded
  - **THEN** the displayed text accurately describes:
    1. **Reminder Events**: Mapped from B[1-4]STARTMIN10 and B[1-4]STARTMIN1, with weekend shifts (Saturday ➔ Friday, Sunday ➔ Monday).
    2. **Retention Events**: Formula of [Burst Start Date] minus 45 days, mapped from B[2-4]STARTDATE, with weekend shifts (Saturday ➔ Friday, Sunday ➔ Monday).
    3. **Compliance Events**: Formula of [Burst Start Date] plus 14 days, mapped from B[1-4]STARTDATE, with weekend shifts (Saturday/Sunday ➔ Monday).
    4. **Formatting**: All specific clock times (e.g., 9:00 AM) and timezone designations (e.g., EST) are omitted.

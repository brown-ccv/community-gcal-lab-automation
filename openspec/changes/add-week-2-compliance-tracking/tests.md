## Automated Tests

- `npm test`: Runs all automated test suites using the native Node.js test runner. This will verify the new parser mapping logic for `B1STARTDATE`, compliance date calculations (exactly 14 days), and custom weekend-shifting (Saturday/Sunday -> Monday) logic.

## Manual Verification

- **Compliance Event Scheduling and Shifting**:
  - **WHEN** uploading a CSV file through the dashboard containing burst dates
  - **THEN** the preview interface shows "Week 2 Compliance Tracking" events scheduled exactly 14 days after the burst start, shifted to Monday if they land on a Saturday or Sunday.

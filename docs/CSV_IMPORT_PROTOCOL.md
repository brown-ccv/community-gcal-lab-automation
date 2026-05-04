CSV Import — Web UI Steps

1. Open the app
   1. Navigate to the running GCal Automation URL (local: `http://localhost:3000`, or the deployed site).
   2. Log in if prompted.

2. Prepare CSV
   1. Ensure you have the FileMaker/Metricwire CSV in `Downloads` (or moved to the shared import folder).

3. Upload & preview
   1. Go to "Import CSV Schedule" and drop or select the CSV.
   2. Wait for the preview to finish.
   3. Read the Preview Summary:
      1. "Importable events" — events the app would create (live mode).
      2. "Duplicates" — events skipped because an idempotency key already exists.
      3. "Sample Events" — first ~10 rows for verification.

4. Run import
   1. Toggle `Demo Mode` for a dry-run (recommended first).
   2. Click `Create Events`.
   3. Wait for the post-import report showing counts: created, skipped, errors.

5. Verify
   1. Confirm on-screen report matches expectations.
   2. Spot-check the configured reminder/retention calendars in Google Calendar for created events.

6. If anything is wrong
   1. Use the import report to identify problematic rows.
   2. If events must be removed, use the app's Delete Recent Events tool with a short time window.

Notes

- The preview already filters out duplicates by checking each event's idempotency key (participant/date/column) in the target calendar.
- Demo Mode lists parsed events but does not write calendars.

Checklist

1. Upload CSV → preview shows importable events.
2. Run Demo import → confirm results.
3. Run Live import → confirm created count and spot-check calendar.

Revision

- 2026-05-04 — concise web-only protocol.

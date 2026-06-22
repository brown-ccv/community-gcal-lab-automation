## Automated Tests

- `npm test`: Executes all test suites using the native Node.js test runner. This verifies CSV parsing functionality (`csvParser.test.js`), event creation calculations including weekend shifting logic (`calendar.logic.test.js`), authentication/passport strategy middleware logic (`auth.middleware.test.js`), and route integrations (`auth.routes.integration.test.js`, `protected.routes.integration.test.js`).

## Manual Verification

- **Authentication Redirect**:
  - **WHEN** accessing the application root `/` without an authenticated session while `BYPASS_AUTH` is `false`
  - **THEN** the system redirects the browser to `/login.html`
- **Bypass Authentication Mode**:
  - **WHEN** running the server with `BYPASS_AUTH=true` and requesting the root `/`
  - **THEN** the application directly loads the main lab automation dashboard without any authentication prompts
- **Manual Event Creation (Demo Mode)**:
  - **WHEN** using the manual entry form to create check-ins for a participant with base date `11/10/2025` in Demo Mode
  - **THEN** the UI shows a success message detailing the calculated check-in event times and dates without actually calling the external Google Calendar API
- **FileMaker CSV Upload and Preview**:
  - **WHEN** uploading a valid FileMaker export CSV file through the Bulk CSV Import portal
  - **THEN** the dashboard renders an interactive list displaying the parsed events, indicating which events are new/importable versus duplicate/skipped

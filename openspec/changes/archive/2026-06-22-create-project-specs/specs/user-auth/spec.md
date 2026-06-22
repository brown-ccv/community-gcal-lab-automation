## ADDED Requirements

### Requirement: Google OAuth 2.0 Access Control
The web application SHALL authenticate users via Google OAuth 2.0. Unauthenticated access to pages and endpoints (except static assets like `login.html`, `styles.css`, and health routes) SHALL be blocked.

#### Scenario: Redirect unauthenticated requests
- **WHEN** an anonymous user visits the application root `/`
- **THEN** the system redirects them to `/login.html`

### Requirement: Bypass Auth Mode
The system SHALL bypass Google OAuth authentication checks if the environment variable `BYPASS_AUTH=true` is configured.

#### Scenario: Access root without logging in
- **WHEN** `BYPASS_AUTH` is set to "true" and an anonymous user requests `/`
- **THEN** the application directly serves the main page without redirecting

### Requirement: Demo Mode Restrictions
The application SHALL simulate calendar API write actions when `DEMO_MODE=true` is set. No actual events SHALL be inserted or deleted in the external Google Calendar API.

#### Scenario: Dry-run check-ins in demo mode
- **WHEN** a check-in event is submitted in demo mode
- **THEN** the system returns simulated dry-run event payloads and does not call Google Calendar insert API

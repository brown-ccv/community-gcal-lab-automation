# MVP Sign-Off Checklist

Use this checklist as the final go or no-go gate for MVP release.

## Session Metadata

- Date: 2026-04-16
- Environment tested: local (automated checks), demo mode (UI readiness)
- Build or commit SHA: pending
- Facilitator: pending
- Notes link: pending

## Status Key

- Pass: requirement met and verified
- Fail: requirement not met
- Blocked: cannot verify yet

## A) Security and Access

| ID | Requirement | Owner | Status | Evidence / Notes |
|---|---|---|---|---|
| A1 | Unauthenticated user is redirected to login on protected routes |  | Pass | Verified by protected route integration test: unauthenticated request returns redirect to login. |
| A2 | In-group user can access protected routes |  | Pass | Verified by protected route integration test for in-group session user. |
| A3 | Out-of-group user is denied protected actions (403) |  | Pass | Verified by protected route integration test for out-of-group proxy-authenticated user. |
| A4 | BYPASS_AUTH is disabled in production config |  | Pass | Deployment workflow sets BYPASS_AUTH=false for Cloud Run env vars. |
| A5 | Health endpoint does not expose sensitive fields |  | Pass | Health response was hardened and deployment smoke script checks for forbidden keys. |

## B) Core Workflow (Manual + CSV)

| ID | Requirement | Owner | Status | Evidence / Notes |
|---|---|---|---|---|
| B1 | Step 1 defaults to CSV mode on load |  | Pass | Main page mode switch initializes to CSV unless URL mode=manual is provided. |
| B2 | Mode switch toggles Step 1 between CSV and manual without breaking Steps 2-4 |  | Pass | Implemented as in-page panel toggle; only Step 1 swaps mode content. |
| B3 | Manual event creation succeeds with valid inputs |  | Blocked | Requires interactive verification in staging/live runtime. |
| B4 | Manual delete by signature succeeds |  | Blocked | Requires interactive verification against runtime API. |
| B5 | CSV preview loads summary and sample events |  | Blocked | Requires interactive verification with sample file upload. |
| B6 | CSV import create succeeds for valid file |  | Blocked | Requires interactive verification in demo and live modes. |
| B7 | Clear demo events action behaves correctly |  | Blocked | Requires interactive verification against runtime API behavior. |
| B8 | Delete recent events action behaves correctly |  | Blocked | Requires interactive verification against runtime API behavior. |

## C) Calendar Correctness

| ID | Requirement | Owner | Status | Evidence / Notes |
|---|---|---|---|---|
| C1 | Created set includes expected follow-ups (1 day, 10 day, 45 day) |  | Pass | Verified by calendar logic tests for create flow output count and shape. |
| C2 | Weekend date handling is correct (shift to Friday where required) |  | Pass | Verified by calendar logic tests asserting weekend shifts to Friday. |
| C3 | Duplicate submission is idempotent (no duplicate events created) |  | Pass | Verified by calendar idempotency test path (existing events are skipped). |
| C4 | Delete operations remove only intended events |  | Blocked | Needs live integration validation against real calendar data. |

## D) Deployment and Operations

| ID | Requirement | Owner | Status | Evidence / Notes |
|---|---|---|---|---|
| D1 | Automated tests pass in CI and locally |  | Pass | Local test suite passes (16/16). Workflow includes test gate before deployment. |
| D2 | Deploy workflow completes prepare, deploy, health, and smoke checks |  | Blocked | Requires running full staging deployment workflow. |
| D3 | Required secrets exist and are mapped correctly |  | Blocked | Requires secret inventory verification in GCP project. |
| D4 | Rollback procedure from runbook is validated |  | Blocked | Requires staged rollback drill execution. |

## E) Usability Validation

| ID | Requirement | Owner | Status | Evidence / Notes |
|---|---|---|---|---|
| E1 | At least 2 users complete CSV task without assistance |  | Blocked | Requires moderated usability run with real users. |
| E2 | At least 2 users complete manual task without assistance |  | Blocked | Requires moderated usability run with real users. |
| E3 | Critical confusion issues are documented and triaged |  | Blocked | To be completed during usability review session. |
| E4 | Support path is visible and accurate |  | Pass | Support links present in app footer and support process documented in runbook. |

## Open Issues and Deferred Work

- Item: Complete live staging verification for core workflow steps B3-B8.
- Impact: MVP readiness cannot be fully signed off without runtime validation.
- Target fix date: pending

- Item: Execute deploy/rollback checks D2-D4 in staging.
- Impact: Operational readiness remains unverified.
- Target fix date: pending

- Item: Run usability study for E1-E3.
- Impact: UX confidence and adoption risk remain unknown.
- Target fix date: pending

## Sign-Off

- Decision: Not Approved (pending blocked items)
- Date: 2026-04-16

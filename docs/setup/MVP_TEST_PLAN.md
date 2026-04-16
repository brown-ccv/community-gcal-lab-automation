# MVP Test Plan (Incremental)

Use this plan after each small change to validate security behavior, usability, and event creation.

## 1) Local MVP smoke setup

Run app in demo mode with auth bypass for fast UI iteration:

```bash
npm run start:demo
```

Expected:

- App starts successfully.
- `/login.html` loads.
- `/api/demo-mode` returns `{ demoMode: true }`.

## 2) Security/route guard checks

Run automated tests:

```bash
npm test
```

Expected baseline:

- Middleware tests pass.
- Route protection integration tests pass.
- Calendar/CSV logic tests pass.

## 3) Manual usability checks (10-15 min)

Use 2-3 realistic tasks:

1. Create events (manual form):
   - Enter base date, title, participant email.
   - Submit once.
   - In demo mode, verify success message and returned dry-run results.
2. Delete events (manual form):
   - Use same inputs.
   - Verify delete simulation message in demo mode.
3. CSV preview and import:
   - Upload known sample CSV.
   - Verify summary, sample rows, and successful import simulation.

Capture:

- Completion status (`pass/fail`) per task.
- Time to complete each task.
- Any confusion points or error messages.

## 4) Live calendar event creation validation (staging/prod)

When ready to test real calendar writes:

1. Set `DEMO_MODE=false`.
2. Ensure credentials and token setup are complete.
3. Create manual event set via `/create-events`.
4. Verify 3 expected events are created (1 day, 10 day, 45 day).
5. Re-submit same request and confirm idempotent behavior (skip existing events).
6. Delete and verify removal.

## 5) Group-access validation (staging)

With `REQUIRE_GROUP_MEMBERSHIP=true`:

1. In-group user:
   - Can access protected routes and perform create/delete/import.
2. Out-of-group user:
   - Receives `403` for protected actions.
3. Unauthenticated user:
   - Redirected to `/login.html` on protected page access.

## 6) MVP release gate

MVP is considered releasable when all are true:

- `npm test` passes.
- Manual demo-mode usability checks pass.
- One real calendar create/delete cycle passes in staging.
- In-group/out-of-group access behavior is verified.
- No sensitive fields are exposed from `/health`.

## 7) Suggested incremental cadence

After every change batch:

1. Run `npm test`.
2. Run 1 manual create flow in demo mode.
3. If auth/permissions changed, run group-access validation in staging.
4. Log findings and proceed to next small change.

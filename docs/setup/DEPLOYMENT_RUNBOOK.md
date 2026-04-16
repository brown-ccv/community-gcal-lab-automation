# Deployment Runbook (Staging -> Production)

This runbook defines how to deploy and validate the app with strict auth/group controls.

## Preconditions

- GitHub workflow `.github/workflows/deploy.yml` is available.
- Required Google Secret Manager secrets exist:
  - `auth-client-id`
  - `auth-client-secret`
  - `session-secret`
  - `reminder-calendar-id`
  - `retention-calendar-id`
   - `required-google-group`
   - `google-admin-user-email`
   - `google-admin-sa-json`
- Cloud Run service account exists and has required roles.
- OAuth callback URI for the target environment is registered.

## Security Baseline

Production deployment must keep these values:

- `NODE_ENV=production`
- `BYPASS_AUTH=false`
- `REQUIRE_GROUP_MEMBERSHIP=true`
- `ALLOWED_DOMAIN=brown.edu`

## Staging Deployment Procedure

1. Open GitHub Actions.
2. Select workflow: `Deploy to Google Cloud Run`.
3. Run workflow with:
   - `environment=staging`
   - region required by Brown policy (for example `us-east1`).
4. Wait for all phases to complete:
   - Prepare (includes `npm test` gate)
   - Deploy
   - Health check
5. Validate staging behavior:
   - `GET /health` returns `status: ok` and no secret leakage.
   - In-group account can access protected routes.
   - Out-of-group account receives `403` on protected routes.
   - OAuth login flow works when proxy headers are not present.

## Production Deployment Procedure

1. Confirm staging checks have passed for the same commit SHA.
2. Re-run the workflow with:
   - `environment=production`
   - approved region.
3. Validate production:
   - Login and protected-route access as expected.
   - CSV preview/import and create/delete endpoints function normally.
   - No auth bypass and no sensitive health output.

## Rollback Procedure

The workflow contains an automatic rollback step on deploy failure.

If manual rollback is needed:

1. Identify prior healthy revision:
   - `gcloud run revisions list --service=<service> --region=<region> --sort-by=~creationTimestamp`
2. Shift 100% traffic to previous revision:
   - `gcloud run services update-traffic <service> --region=<region> --to-revisions=<previous>=100`
3. Re-run validation checks from staging/production validation list.

## Incident and Support

If production is degraded:

1. Trigger rollback first.
2. Open incident notes with timestamp, failing endpoint, and affected users.
3. Contact support:
   - Email: `support.ccv@brown.edu`
   - Office hours: Friday 10:00-12:00

## Post-Deploy Checklist

- Record deployed commit SHA and environment.
- Record whether rollback was needed.
- Confirm support handoff details are current.
- Capture any new follow-up tasks in project notes.

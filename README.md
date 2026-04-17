# Google Calendar Lab Invite Automation

Automated creation of follow-up check-in calendar events for lab participants.

## Live Demo

**[View Demo Interface](https://gcal-lab-automation.onrender.com/)** - Showcases the UI and functionality (no actual events created)

> **Note:** The hosted version is a demonstration interface. For full functionality with actual Google Calendar event creation, clone this repository and run it locally with your own API credentials.

## Features

- **Batch event creation**: Creates multiple follow-up check-ins (1 day, 10 day, 45 day) from a single base date
- **CSV bulk import**: Upload FileMaker exports to create events for multiple participants at once
- **Service-account calendar access**: Server-side Google Calendar API access without per-user calendar OAuth
- **Idempotent**: Won't create duplicate events if run multiple times
- **Easy cleanup**: Delete test events with a simple command
- **Timezone aware**: Uses America/New_York timezone
- **Automatic invites**: Sends calendar invites to specified attendee (or create events without invites)

## Setup

### 1. Install dependencies

Ensure Node.js v18+ is installed, then run:

```bash
npm install
```

### 2. Set up Google Calendar API credentials

Follow these steps to enable API access:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Calendar API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click "Enable"
4. Create or reuse a **service account JSON key** with Calendar API access
5. Store that JSON in `GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON` (or `GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON`)
6. Share the target Google Calendar with the service account email as "Make changes to events"

For detailed Google API setup instructions, see `docs/SETUP_GUIDE.md`.

### 3. Calendar authorization model

Calendar writes happen through the configured service account identity. There is no per-user calendar OAuth/consent step in proxy-mode deployments.

## Usage

### Web Interface (Recommended for Teams)

**Start the web server:**

For **real calendar event creation** (requires service account JSON env secret):
```bash
npm start
```

For **demo mode** (UI only, no actual events created):
```bash
npm run start:demo
```

Then open your browser and visit: **http://localhost:3000**

You'll see a clean web form where you can:
- **Manual Entry**: Enter base date, participant ID, and time for single participants
- **CSV Import**: Upload FileMaker CSV exports to create events for multiple participants at once
- See a preview of events to be created
- Create or delete events with one click
- A banner will indicate if you're in Demo or Live mode

See `docs/WEB_USER_GUIDE.md` for detailed instructions for lab members.

### CSV Import (Bulk Creation)

For creating events for multiple participants from FileMaker exports:

**Web Interface:**
1. Navigate to http://localhost:3000
2. Click "Bulk CSV Import"
3. Upload or drag-drop your CSV file
4. Review the summary and sample events
5. Click "Create Events"

**CSV Format:**
The tool expects FileMaker P16_FM_dates.csv format with columns:
- `ID` - Participant identifier
- `IDSTATUS` - Must be "Active"
- `B1STARTMIN10`, `B1STARTMIN1`, `B1STARTDATE` - BURST 1 dates
- `B2STARTMIN10`, `B2STARTMIN1`, `B2STARTDATE` - BURST 2 dates
- `B3STARTMIN10`, `B3STARTMIN1`, `B3STARTDATE` - BURST 3 dates
- `B4STARTMIN10`, `B4STARTMIN1`, `B4STARTDATE` - BURST 4 dates

Events are created without attendees (calendar-only events).

See `docs/CSV_IMPORT_IMPLEMENTATION.md` for detailed documentation.



## How it works

### Idempotency

Events are identified by a unique key stored in `extendedProperties.private.eventKey`:
```
{baseDate}_{title}_{followUpType}
Example: "11-10-2025_BURST-001_10day"
```

If you run the script again with the same inputs, existing events are skipped.

### Event structure

Each created event includes:
- **Title**: `{Participant ID} - {X day} check-in`
- **Duration**: 30 minutes
- **Timezone**: America/New_York
- **Attendees**: gregory.lazatin2006@gmail.com
- **Reminders**: None (as requested)
- **Description**: Includes base date and follow-up type metadata

## Deployment

### Local Use
The web interface runs on http://localhost:3000 by default. Perfect for single-computer lab use.

### Cloud Deployment (Google Cloud Run)
**Deploy to production on Google Cloud Run** - fully managed, auto-scaling, pay-per-use serverless platform.

📚 **[Complete Deployment Guide](.deployment/DEPLOYMENT.md)** - Step-by-step instructions for deploying to Google Cloud Run.

**Key Features:**
- ✅ **$0/month** for typical lab usage (free tier)
- ✅ **Auto-scaling** from 0 to 10 instances based on traffic
- ✅ **HTTPS included** with automatic SSL certificates
- ✅ **GitHub Actions CI/CD** with automated deployment
- ✅ **Secure secrets** via Google Cloud Secret Manager
- ✅ **5-minute deployment** from code to production

**Quick Start:**
```bash
# 1. Setup GCP infrastructure
./.deployment/scripts/gcp/setup-service-account.sh
./.deployment/scripts/gcp/setup-gcp-secrets.sh

# 2. Setup GitHub Actions
./.deployment/scripts/github/setup-github-secrets.sh

# 3. Deploy via GitHub Actions
# Go to: Actions → "Deploy to Google Cloud Run" → Run workflow
```

**Region:** `us-east1` (closest to Providence, RI) - required by Brown University GCP org policy.

## Documentation

All documentation is in the respective folders:
- **`.deployment/DEPLOYMENT.md`** - Complete cloud deployment guide (Google Cloud Run)
- `docs/setup/DEPLOYMENT_RUNBOOK.md` - Staging/production rollout, validation, and rollback runbook
- `docs/setup/MVP_TEST_PLAN.md` - Incremental MVP validation checklist for usability and event creation
- `docs/setup/MVP_SIGNOFF_CHECKLIST.md` - Final MVP go/no-go checklist with owner and pass/fail tracking
- `docs/WEB_USER_GUIDE.md` - Simple guide for lab members
- `docs/SETUP_GUIDE.md` - Google Calendar API setup (detailed)
- `docs/setup/DEPLOYMENT_PLAN.md` - Original Render.com deployment plan (archived)
- `docs/CUSTOMIZATION.md` - How to modify intervals, times, etc.
- `docs/PHASE1_COMPLETE.md` - Phase 1 summary and next steps
- `docs/design-qs.md` - Design decisions and requirements
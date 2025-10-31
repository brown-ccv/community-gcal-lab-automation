# Google Calendar Lab Invite Automation

Automated creation of follow-up check-in calendar events for lab participants.

## 🌐 Live Demo

**[View Demo Interface](https://gcal-lab-automation.onrender.com/)** - Showcases the UI and functionality (no actual events created)

> **Note:** The hosted version is a demonstration interface. For full functionality with actual Google Calendar event creation, clone this repository and run it locally with your own API credentials.

## Features

- 📅 **Batch event creation**: Creates multiple follow-up check-ins (1 day, 10 day, 45 day) from a single base date
- � **CSV bulk import**: Upload FileMaker exports to create events for multiple participants at once
- �🔐 **OAuth2 authentication**: Secure Google Calendar API access
- 🔄 **Idempotent**: Won't create duplicate events if run multiple times
- 🗑️ **Easy cleanup**: Delete test events with a simple command
- ⏰ **Timezone aware**: Uses America/New_York timezone
- ✉️ **Automatic invites**: Sends calendar invites to specified attendee (or create events without invites)

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
4. Create OAuth2 credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose **"Desktop app"** as application type
   - Name it (e.g., "GCal Automation")
   - Click "Create"
5. Download the JSON file
6. Rename it to `credentials.json` and place it in the project root directory

**Important**: Keep `credentials.json` private! It's already in `.gitignore`.

For detailed Google API setup instructions, see `docs/SETUP_GUIDE.md`.

### 3. First-time authorization

On the first run, the script will:
1. Open a browser authorization URL
2. Ask you to log in with your Google account
3. Request permission to manage your calendar
4. Provide an authorization code to paste back into the terminal

The access token will be saved to `token.json` for future runs.

## Usage

### Web Interface (Recommended for Teams)

**Start the web server:**

For **real calendar event creation** (requires credentials.json):
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

### CLI Mode (Alternative)

Run the script without arguments for an interactive prompt:

```bash
npm run cli
```

You'll be prompted to enter:
- Base date (MM/DD/YYYY) - the reference date for calculating follow-ups
- Participant ID or event name - will be used in event titles
- Start time (HH:MM) - defaults to 09:00 if left blank

The script will create three calendar events:
- `{Title} - 1 day check-in`
- `{Title} - 10 day check-in`
- `{Title} - 45 day check-in`

Example interaction:
```
Enter base date (MM/DD/YYYY): 11/10/2025
Enter participant ID or event name: BURST-001
Enter start time (HH:MM) [default: 09:00]: 14:30
```

This creates:
- "BURST-001 - 1 day check-in" on 11/11/2025 at 14:30
- "BURST-001 - 10 day check-in" on 11/20/2025 at 14:30
- "BURST-001 - 45 day check-in" on 12/25/2025 at 14:30

All events are 30 minutes long and invite `gregory.lazatin2006@gmail.com`.

### CSV Import (Bulk Creation)

For creating events for multiple participants from FileMaker exports:

**CLI Mode:**
```bash
npm run csv-import
```

You'll be prompted to:
- Specify CSV file path (defaults to `src/data/P16_FM_dates.csv`)
- Set event time (defaults to 09:00)
- Choose dry run (preview) or real import

**Web Interface:**
1. Navigate to http://localhost:3000
2. Click "📊 Bulk CSV Import →"
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

### CLI Delete Mode

To remove test events from the command line:

```bash
npm run cli -- --delete --date 11/10/2025 --title "BURST-001"
```

Or use the delete form in the web interface (easier).

## Configuration

Edit these values in the source files as needed:

**`src/cli.js`**:
- `DEFAULT_TIME`: Default start time (currently `09:00`)
- `DEFAULT_ATTENDEE`: Email to invite (currently `gregory.lazatin2006@gmail.com`)

**`src/calendar.js`**:
- `TIMEZONE`: Timezone for events (currently `America/New_York`)
- `DEFAULT_DURATION_MINUTES`: Event duration (currently `30`)
- `FOLLOW_UP_TYPES`: Array of follow-up intervals to create

Example of adding more follow-up types:
```javascript
const FOLLOW_UP_TYPES = [
  { label: '1 day', days: 1 },
  { label: '10 day', days: 10 },
  { label: '45 day', days: 45 },
  { label: '1 week', days: 7 },      // Add this
  { label: '7 day post', days: 7 },  // Or this
];
```

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

## Troubleshooting

### "Error 403: access_denied" during authorization

This is the most common issue! It means you need to add yourself as a test user in the OAuth consent screen.

**Quick fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **"APIs & Services"** → **"OAuth consent screen"**
4. Scroll to **"Test users"** and click **"+ ADD USERS"**
5. Add your email address
6. Click **"Save"** and wait 1-2 minutes
7. Try authorization again

See `docs/SETUP_GUIDE.md` for detailed OAuth consent screen setup instructions.

### "credentials.json not found"
Make sure you've completed step 2 in Setup above.

### "Invalid grant" or expired token
Delete `token.json` and re-run. You'll be asked to authorize again.

### Events not appearing in calendar
- Check that you're logged in with the correct Google account
- Verify the calendar isn't filtered in Google Calendar UI
- Check the terminal output for error messages

### Rate limiting
The script creates events sequentially to avoid rate limits. With 3-6 events per run, you shouldn't hit quota issues.

## Deployment

### Local Use
The web interface runs on http://localhost:3000 by default. Perfect for single-computer lab use.

### Cloud Deployment (Render.com)
To make the tool accessible from anywhere:

1. See `docs/DEPLOYMENT_PLAN.md` for complete rollout plan
2. Follow Phase 2 instructions for Render.com deployment
3. Free tier supports unlimited users for lab use

**Cost:** $0/month on Render.com free tier

## Documentation

All documentation is in the `docs/` folder:
- `docs/WEB_USER_GUIDE.md` - Simple guide for lab members
- `docs/SETUP_GUIDE.md` - Google Calendar API setup (detailed)
- `docs/DEPLOYMENT_PLAN.md` - Complete cloud deployment plan
- `docs/CUSTOMIZATION.md` - How to modify intervals, times, etc.
- `docs/PHASE1_COMPLETE.md` - Phase 1 summary and next steps
- `docs/design-qs.md` - Design decisions and requirements

Potential improvements:
- CSV import from FileMaker
- Support for multiple attendees
- Customizable reminder schedules
- Staging calendar with approval workflow

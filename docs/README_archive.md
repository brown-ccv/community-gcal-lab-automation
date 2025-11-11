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

**CLI Mode:**
```bash
npm run csv-import
```

You'll be prompted to:
- Specify CSV file path (defaults to `src/data/P16_FM_dates.csv`)
- Set event time (defaults to 09:00)
- Choose dry run (preview) or real import

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

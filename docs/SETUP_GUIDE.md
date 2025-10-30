# Google Calendar API Setup Guide

This guide walks you through setting up Google Calendar API credentials for the automation script.

## Step-by-step instructions

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top (next to "Google Cloud")
3. Click "New Project"
4. Enter a project name (e.g., "Lab Calendar Automation")
5. Click "Create"
6. Wait for the project to be created (notification will appear)

### 2. Enable Google Calendar API

1. Make sure your new project is selected (check the dropdown at the top)
2. Go to **"APIs & Services"** → **"Library"** (from the left sidebar)
3. In the search bar, type: `Google Calendar API`
4. Click on **"Google Calendar API"**
5. Click the **"Enable"** button
6. Wait for it to enable (should take a few seconds)

### 3. Configure OAuth Consent Screen

Before creating credentials, you need to configure the OAuth consent screen:

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Choose **"External"** user type (unless you have a Google Workspace)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name**: "Lab Calendar Automation" (or your choice)
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **"Save and Continue"**
6. On the **Scopes** page, click **"Save and Continue"** (we'll use default scopes)
7. On the **Test users** page, click **"Add Users"**
8. Add your email address (gregory.lazatin2006@gmail.com)
9. Click **"Save and Continue"**
10. Review the summary and click **"Back to Dashboard"**

### 4. Create OAuth2 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"+ Create Credentials"** at the top
3. Select **"OAuth client ID"**
4. For **Application type**, choose **"Desktop app"**
5. Give it a name: "Desktop Client" (or your choice)
6. Click **"Create"**
7. A dialog will appear with your client ID and secret - click **"OK"** (we'll download the JSON next)

### 5. Download credentials.json

1. You should now see your OAuth 2.0 Client ID in the credentials list
2. Click the **download icon** (⬇️) on the right side of your client ID row
3. A JSON file will download (usually named something like `client_secret_xxxxx.json`)
4. Rename this file to exactly: `credentials.json`
5. Move it to your project root directory:
   ```
   /Users/gregorylazatin/Documents/College/Second-year/UTRA/GCal Automation/credentials.json
   ```

### 6. Verify the file location

Your project structure should look like this:

```
GCal Automation/
├── credentials.json          ← Your downloaded file (renamed)
├── src/
│   ├── cli.js
│   ├── auth.js
│   └── calendar.js
├── package.json
└── README.md
```

**Important**: `credentials.json` is already in `.gitignore` and will NOT be committed to git.

## First-time authorization

When you run the script for the first time:

```bash
node src/cli.js
```

You'll see:

```
🔐 Authorize this app by visiting this URL:
https://accounts.google.com/o/oauth2/v2/auth?...
```

1. Copy the entire URL and paste it into your browser
2. Log in with your Google account (the one you added as a test user)
3. You may see a warning: "Google hasn't verified this app" - click **"Continue"**
4. Review the permissions and click **"Allow"**
5. You'll be redirected to a page showing an authorization code
6. Copy the code
7. Paste it back into the terminal where the script is waiting
8. The script will save a `token.json` file for future runs

## Troubleshooting

### "Error 403: access_denied" (Most Common Issue!)

This happens when you haven't added yourself as a test user. **You MUST complete step 3** (Configure OAuth Consent Screen) before the authorization will work.

**Quick fix:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project from the dropdown at the top
3. Go to **"APIs & Services"** → **"OAuth consent screen"**
4. Scroll down to **"Test users"** section
5. Click **"+ ADD USERS"**
6. Enter your email: `gregory.lazatin2006@gmail.com`
7. Click **"Save"**
8. Wait 1-2 minutes for changes to propagate
9. Try running `node src/cli.js` again

If still getting the error:
- Make sure the email you're logging in with matches the test user email
- Try in an incognito/private browser window
- Check that "Publishing status" shows "Testing" (not "In production")

### "Access blocked: This app's request is invalid"
- Make sure you added your email as a test user in step 3.8 above
- Try using an incognito/private browser window

### "Error: invalid_grant"
- Your token has expired
- Delete `token.json` and run the script again to re-authorize

### "credentials.json not found"
- Check the file is in the project root (not in `src/` folder)
- Check the filename is exactly `credentials.json` (no extra extensions)

### Still having issues?
- Double-check you enabled the Google Calendar API (step 2)
- Make sure you're using the correct Google account
- Try creating new credentials and downloading a fresh `credentials.json`

## Security notes

- Never commit `credentials.json` or `token.json` to git
- Don't share these files with others
- If credentials are compromised, delete them in Google Cloud Console and create new ones
- The OAuth token can be revoked at: https://myaccount.google.com/permissions

# Authentication Setup Guide

This guide will walk you through setting up Google OAuth authentication for the Lab Calendar Automation web app.

## Overview

The app now requires users to sign in with their **@brown.edu** Google account before they can create calendar events. This restricts access to authorized Brown University users only.

## Step 1: Create OAuth Web Application Client

You need a **separate** OAuth client for authentication (different from the one used for calendar API access).

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your existing project (or create a new one)
3. Navigate to **"APIs & Services"** → **"Credentials"**
4. Click **"Create Credentials"** → **"OAuth client ID"**
5. Application type: **"Web application"**
6. Name: `Lab Calendar Auth` (or any descriptive name)
7. Authorized redirect URIs - Add both:
   - `http://localhost:3000/auth/google/callback` (for local development)
   - `https://your-app-name.onrender.com/auth/google/callback` (for production, if deploying)
8. Click **"Create"**
9. **Important**: Download the JSON credentials or copy the Client ID and Client Secret

## Step 2: Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# Authentication credentials (from Step 1)
AUTH_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
AUTH_CLIENT_SECRET=your-client-secret-here

# Session secret (generate a random string)
SESSION_SECRET=run-this-command-to-generate-secret

# Allowed domain
ALLOWED_DOMAIN=brown.edu

# Callback URL (use localhost for development)
AUTH_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Generate Session Secret

Run this command to generate a secure random session secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as your `SESSION_SECRET` value.

## Step 3: Start the Server

### For Production Use (Authentication Required):

```bash
npm start
```

This starts the server with authentication enabled. Users must sign in with @brown.edu accounts.

### For Development (Skip Authentication):

```bash
npm run dev
```

This bypasses authentication so you can quickly test calendar features without logging in.

### For Demo (Authentication + Simulated Calendar):

```bash
DEMO_MODE=true npm start
```

This requires authentication but simulates calendar events (no real Google Calendar API calls).

## Step 4: Test Authentication

1. Start the server: `npm start`
2. Open browser: http://localhost:3000
3. You should see the login page with "Sign in with Google" button
4. Click the button
5. Google OAuth screen appears
6. Sign in with a @brown.edu account → should succeed
7. Try with a non-@brown.edu account → should fail with "Access Denied"

## Step 5: Verify Everything Works

After successful authentication:
- You should see your email in the top-right corner
- You should be able to access the calendar creation forms
- Try creating an event (use Demo Mode if you don't want real calendar calls)
- Click "Logout" to test logging out
- Verify you're redirected back to the login page

## Troubleshooting

### "AUTH_CLIENT_ID and AUTH_CLIENT_SECRET not set"

Make sure your `.env` file exists and contains valid credentials. The file should be in the project root directory.

### "Access Denied" for @brown.edu accounts

Double-check:
1. The domain check is case-sensitive - must be lowercase `brown.edu`
2. Your `.env` has `ALLOWED_DOMAIN=brown.edu`
3. The Google account you're using actually ends with `@brown.edu`

### Redirect URI mismatch error

The redirect URI in Google Cloud Console must **exactly match** the `AUTH_CALLBACK_URL` in your `.env` file.

For local development:
- `.env`: `AUTH_CALLBACK_URL=http://localhost:3000/auth/google/callback`
- Google Console: `http://localhost:3000/auth/google/callback`

### Session expires too quickly

Sessions last 24 hours by default. To change this, edit `src/server.js`:

```javascript
cookie: {
  maxAge: 48 * 60 * 60 * 1000, // 48 hours instead of 24
}
```

### "Cannot bypass authentication in production" error

Good! This is a security feature. You tried to set `BYPASS_AUTH=true` in production. Remove that environment variable or set it to `false`.

## Production Deployment Notes

When deploying to Render.com or another host:

1. **Update callback URL** in Google Cloud Console:
   - Add `https://your-app-name.onrender.com/auth/google/callback`

2. **Set environment variables** in Render dashboard:
   ```
   AUTH_CLIENT_ID=...
   AUTH_CLIENT_SECRET=...
   SESSION_SECRET=...
   ALLOWED_DOMAIN=brown.edu
   AUTH_CALLBACK_URL=https://your-app-name.onrender.com/auth/google/callback
   NODE_ENV=production
   BYPASS_AUTH=false  (or omit entirely)
   ```

3. **NEVER set `BYPASS_AUTH=true` in production!**

## Development Workflows

### Quick Testing (No Auth, Real Calendar):
```bash
npm run dev
```

### Test Auth Flow (Auth Required, Simulated Calendar):
```bash
DEMO_MODE=true npm start
```

### Full Production Simulation (Auth + Real Calendar):
```bash
npm start
```

## Security Notes

- **Domain Check**: Only exact `@brown.edu` (lowercase) is allowed - case-sensitive
- **Separated OAuth**: User authentication uses different credentials than calendar API access
- **Session-based**: Users stay logged in for 24 hours
- **No Calendar Access**: User's Google account is ONLY used for authentication, not calendar operations
- **Safe for Brown's Restrictions**: Works even though Brown has disabled API access on organizational emails

## Need Help?

- Check `docs/security/auth.md` for detailed architecture documentation
- See `.env.example` for all available environment variables
- Contact: gregory.lazatin2006@gmail.com

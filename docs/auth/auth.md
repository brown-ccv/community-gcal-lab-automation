# Authentication Implementation Plan

## Quick Reference

### Domain Verification
- **ONLY** `@brown.edu` (lowercase, case-sensitive) is allowed
- Reject all variations: `@Brown.edu`, `@BROWN.EDU`, etc.

### Development Commands
```bash
npm run dev          # Local testing: No auth, real calendar
npm start            # Production: Auth required, real calendar  
npm run start:demo   # Demo: Auth required, simulated calendar
```

### Environment Variables
```env
BYPASS_AUTH=true     # Skip authentication (development only!)
DEMO_MODE=true       # Simulate calendar events (no real API calls)
ALLOWED_DOMAIN=brown.edu  # Domain to check (case-sensitive)
```

---

## Overview

This document outlines the authentication system for restricting access to the Google Calendar Lab Automation web application to Brown University users only.

## Requirements

1. **Domain Restriction**: Only users with `@brown.edu` email addresses can access the application
2. **Separation of Concerns**: 
   - OAuth authentication is ONLY used for verifying user identity and domain
   - Calendar API access continues to use existing service/desktop credentials (not user's calendar)
3. **User Experience**: 
   - Landing page shows only "Sign in with Google" button on blank screen
   - After successful authentication, user sees the full calendar automation interface
   - Session persists for 24 hours
4. **Organization Constraint**: Brown University has disabled Google API access on organizational emails, so we cannot use user credentials for calendar operations

## Architecture

### Two Separate OAuth Flows

**Flow 1: User Authentication (NEW)**
- **Purpose**: Verify user identity and check domain
- **Credentials**: Web application OAuth client (separate from calendar access)
- **Scope**: `profile` and `email` only (no calendar access needed)
- **User**: Individual lab members authenticating with @brown.edu accounts
- **Storage**: Session-based (express-session)

**Flow 2: Calendar API Access (EXISTING)**
- **Purpose**: Create/delete calendar events
- **Credentials**: Desktop application OAuth client (existing credentials.json)
- **Scope**: `calendar.events` scope
- **User**: Lab administrator's non-@brown.edu account (e.g., personal Gmail)
- **Storage**: token.json (persisted on server)

### Why This Separation Works

Since Brown has disabled API access for @brown.edu accounts, we:
1. Use @brown.edu accounts ONLY for authentication (verify who the user is)
2. Use a separate authorized account (admin's personal account) for actual calendar operations
3. All calendar events are created under the admin's calendar, regardless of who is authenticated

This means:
- Lab members sign in with @brown.edu to prove they're authorized users
- But the actual calendar API calls use the existing credentials.json/token.json setup
- No conflict with Brown's API restrictions

## Implementation Details

### 1. Google Cloud Console Setup

**Create NEW OAuth Client for Authentication:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a NEW OAuth 2.0 Client ID (separate from existing one)
3. Application type: **Web application**
4. Name: "GCal Automation - User Auth"
5. Authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback`
   - `https://your-app.onrender.com/auth/google/callback` (add when deploying)
6. Download credentials → save as `auth-credentials.json`

**Keep Existing OAuth Client:**
- The existing `credentials.json` remains unchanged
- Used only for calendar operations
- Desktop application type

### 2. Required npm Packages

```bash
npm install express-session passport passport-google-oauth20
```

### 3. Environment Variables

Add to `.env`:
```env
# Authentication (NEW)
AUTH_CLIENT_ID=your-web-auth-client-id
AUTH_CLIENT_SECRET=your-web-auth-client-secret
SESSION_SECRET=randomly-generated-secret-key
ALLOWED_DOMAIN=brown.edu

# Callback URL (change for production)
AUTH_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Calendar API (EXISTING - no changes)
# These are loaded from credentials.json/token.json as before
```

### 4. File Structure

New files to create:
```
public/
  login.html           # Landing page with "Sign in with Google" button
src/
  middleware/
    auth.js            # Authentication middleware
  routes/
    auth.js            # Auth routes (login, callback, logout)
auth-credentials.json  # Web OAuth credentials (gitignored)
```

Existing files to modify:
```
src/server.js          # Add session, passport, and protected routes
public/index.html      # Add logout button
public/csv-import.html # Add logout button
.gitignore             # Add auth-credentials.json
```

### 5. User Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User visits http://localhost:3000                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Authenticated?│
                  └──────┬───────┘
                         │
            ┌────────────┴────────────┐
            │                         │
           NO                        YES
            │                         │
            ▼                         ▼
    ┌───────────────┐         ┌──────────────┐
    │  login.html   │         │  index.html  │
    │               │         │              │
    │  [Sign in     │         │  Full webapp │
    │   with Google]│         │  interface   │
    └───────┬───────┘         └──────────────┘
            │
            │ (User clicks button)
            ▼
    ┌───────────────────┐
    │ Google OAuth      │
    │ Login Screen      │
    └────────┬──────────┘
             │
             ▼
    ┌────────────────────┐
    │ User selects       │
    │ @brown.edu account │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Backend verifies   │
    │ email domain       │
    └────────┬───────────┘
             │
    ┌────────┴────────┐
    │                 │
   Valid            Invalid
 @brown.edu      (other domain)
    │                 │
    ▼                 ▼
┌─────────┐      ┌─────────────┐
│ Create  │      │ Reject      │
│ session │      │ Show error  │
│ Redirect│      │ Redirect to │
│ to app  │      │ login       │
└─────────┘      └─────────────┘
```

### 6. Security Considerations

**Session Security:**
- Sessions expire after 24 hours (configurable)
- Session secret should be strong and random
- Sessions stored in memory (or Redis for production)
- Secure cookies in production (HTTPS only)

**Domain Verification:**
- Check email domain on EVERY authentication
- Backend validation (don't trust client-side)
- **CASE-SENSITIVE check**: ONLY `@brown.edu` (lowercase) is valid
- Reject `@Brown.edu`, `@BROWN.EDU`, or any other variation
- Rationale: `brown.edu` is the only domain generated by the organization, so we enforce exact match for security

**API Separation:**
- User OAuth never requests calendar scopes
- Calendar operations continue using existing token.json
- No risk of exposing user calendar data

**Error Handling:**
- Invalid domain → clear error message
- Failed authentication → redirect to login
- Expired session → redirect to login (not error page)

### 7. UI/UX Details

**Login Page (login.html):**
- Clean, centered design
- Only contains:
  - App title/logo (optional)
  - "Sign in with Google" button
  - Brief explanation: "Brown University access required"
- No navigation, no forms, minimal styling
- Google-branded button (use official Google button guidelines)

**Authenticated Pages:**
- Add user info display (name, email) in header
- Add "Logout" button in header
- Session indicator (optional): "Signed in as [name]"
- All existing functionality remains the same

**Post-Login:**
- Redirect to original requested URL (or index.html by default)
- Session established automatically
- No additional clicks required

### 8. Development Mode vs Production Mode

**Important**: We need two different modes for development and production.

#### Development Mode (Authentication Bypassed)

Used for local testing when you don't want to authenticate every time.

**Environment Variable:**
```env
BYPASS_AUTH=true
```

**Behavior:**
- Authentication is **completely bypassed**
- No redirect to login page
- App loads directly with full functionality
- Useful for testing calendar features without OAuth setup
- **Security Note**: Never enable in production!

**NPM Command:**
```bash
npm run dev
# or
npm run start:dev
```

This command sets `BYPASS_AUTH=true` automatically.

#### Production Mode (Authentication Required)

Used for deployment and when testing authentication flow.

**Environment Variable:**
```env
BYPASS_AUTH=false
# or omit this variable entirely (defaults to false)
```

**Behavior:**
- Authentication is **required**
- All routes protected except `/auth/*` and `/login.html`
- Users must sign in with @brown.edu to access app

**NPM Command:**
```bash
npm start
```

This is the default mode (authentication enabled).

#### Demo Mode (Calendar API Only)

The existing `DEMO_MODE` environment variable is separate and controls **calendar operations** only:
- `DEMO_MODE=true`: Simulates calendar events (no real Google Calendar API calls)
- `DEMO_MODE=false`: Real calendar event creation

These can be combined:
- `BYPASS_AUTH=true` + `DEMO_MODE=true`: Local testing, no auth, no calendar calls
- `BYPASS_AUTH=true` + `DEMO_MODE=false`: Local testing, no auth, real calendar calls
- `BYPASS_AUTH=false` + `DEMO_MODE=true`: Production-like auth, simulated calendar
- `BYPASS_AUTH=false` + `DEMO_MODE=false`: Full production (auth + real calendar)

### 9. Testing Plan

**Local Development:**
1. Start server with `npm start`
2. Visit http://localhost:3000
3. Verify redirect to login page
4. Click "Sign in with Google"
5. Authenticate with @brown.edu account → should succeed
6. Try with non-@brown.edu account → should fail with clear error
7. Verify session persists on refresh
8. Test logout button
9. Verify creating calendar events still works (uses existing credentials)

**Production Deployment:**
1. Update `AUTH_CALLBACK_URL` in environment variables
2. Add production callback URL to Google Cloud Console
3. Test with multiple @brown.edu accounts
4. Verify HTTPS redirects work correctly
5. Test session expiration (24 hour timeout)

### 10. Migration Path

**Step 1: Add Authentication (Non-Breaking)**
- Install packages
- Add auth routes and middleware
- Create login.html
- **Don't protect routes yet** - add authentication but make it optional

**Step 2: Test with Real Users**
- Have lab members test login flow
- Verify @brown.edu domain check works
- Ensure calendar operations still work

**Step 3: Enable Protection**
- Add `requireAuth` middleware to all routes except login
- Now authentication is required

**Step 4: Deploy to Production**
- Update callback URLs
- Test on Render.com
- Announce to lab users

### 11. Future Enhancements (Optional)

- **Role-based access**: Admin vs. regular user permissions
- **Audit logging**: Track who created which events
- **User management**: Allow admins to see who has accessed the app
- **Remember me**: Extended session duration option
- **2FA**: Add additional authentication layer if needed

## Critical Security Decisions

### 1. Case-Sensitive Domain Check (MAJOR CHANGE)

**Decision**: Domain verification is **case-sensitive**.

**Implementation**:
```javascript
// CORRECT - Only this exact string is valid
if (email.endsWith('@brown.edu')) {
  // Allow access
}

// WRONG - Do not use case-insensitive check
if (email.toLowerCase().endsWith('@brown.edu')) {
  // This is too permissive!
}
```

**Rationale**: 
- `brown.edu` is the ONLY domain generated by Brown University's organization
- All legitimate Brown emails will always be lowercase `@brown.edu`
- Any variation (`@Brown.edu`, `@BROWN.EDU`) indicates potential spoofing or non-organizational account
- Strict matching reduces attack surface

**Test Cases**:
- ✅ `user@brown.edu` → ALLOW
- ❌ `user@Brown.edu` → DENY
- ❌ `user@BROWN.EDU` → DENY
- ❌ `user@brown.edu.evil.com` → DENY (use exact match, not contains)

### 2. Development Mode Bypass

**Decision**: Add `BYPASS_AUTH=true` environment variable to skip authentication during local development.

**NPM Commands**:
```json
{
  "scripts": {
    "start": "node start-live.js",           // Production: auth required, real calendar
    "dev": "BYPASS_AUTH=true node src/server.js",  // Development: no auth, real calendar
    "start:demo": "node start-demo.js"       // Demo: auth required, simulated calendar
  }
}
```

**Note**: The `dev` script should be modified to set `BYPASS_AUTH=true` before starting the server.

**Usage**:
```bash
# When testing calendar features locally (no login required)
npm run dev

# When testing authentication flow (login required)
npm start

# When showing demo to others (no real calendar calls, but auth required)
DEMO_MODE=true npm start

# Ultimate convenience mode (no login, no API calls)
BYPASS_AUTH=true DEMO_MODE=true npm start
```

**Security Warning**:
⚠️ **NEVER set `BYPASS_AUTH=true` in production!**
- Only use locally for development
- Production deployments must have `BYPASS_AUTH=false` or omit it entirely
- Consider adding runtime check to prevent production bypass

**Implementation Check**:
```javascript
// Add this safety check in server.js
if (process.env.BYPASS_AUTH === 'true' && process.env.NODE_ENV === 'production') {
  console.error('ERROR: Cannot bypass authentication in production!');
  process.exit(1);
}
```

## Summary

This authentication approach:
- ✅ Restricts access to @brown.edu users only (case-sensitive)
- ✅ Works around Brown's API restrictions (auth only, no calendar access)
- ✅ Maintains existing calendar functionality unchanged
- ✅ Provides clean "Sign in with Google" landing page
- ✅ Session-based for good UX (24 hour persistence)
- ✅ Separates authentication from calendar operations
- ✅ Easy to test locally with `npm run dev` (bypasses auth)
- ✅ Secure by default in production (auth cannot be bypassed)
- ✅ Ready for production deployment

## Questions/Decisions Needed

- [ ] Confirm 24 hour session timeout is acceptable (configurable)
- [ ] Decide on Redis for session storage in production (optional, improves scalability)
- [ ] Confirm existing calendar credentials owner (who's authorized for calendar API)
- [ ] Decide if we want to show user's name/email in UI after login
- [ ] Decide on logout button placement (header? corner?)

---

**Next Steps**: Ready to implement! Let me know when you're ready and I'll start with installing packages and creating the authentication structure.
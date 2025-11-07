# Authentication Implementation Plan

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
- Case-insensitive check: `@brown.edu`, `@Brown.edu`, `@BROWN.EDU` all valid

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

### 8. Demo Mode Behavior

**Important**: Demo mode should work WITHOUT authentication for development/testing.

When `DEMO_MODE=true`:
- Authentication is **bypassed**
- Login page skips directly to app
- All users can access (useful for testing UI without OAuth setup)
- Clear banner indicates "DEMO MODE - No authentication"

When `DEMO_MODE=false` (production):
- Authentication is **required**
- All routes protected except `/auth/*` and `/login.html`

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

## Summary

This authentication approach:
- ✅ Restricts access to @brown.edu users only
- ✅ Works around Brown's API restrictions (auth only, no calendar access)
- ✅ Maintains existing calendar functionality unchanged
- ✅ Provides clean "Sign in with Google" landing page
- ✅ Session-based for good UX (24 hour persistence)
- ✅ Separates authentication from calendar operations
- ✅ Easy to test in demo mode
- ✅ Ready for production deployment

## Questions/Decisions Needed

- [ ] Confirm 24 hour session timeout is acceptable (configurable)
- [ ] Decide on Redis for session storage in production (optional, improves scalability)
- [ ] Confirm existing calendar credentials owner (who's authorized for calendar API)
- [ ] Decide if we want to show user's name/email in UI after login
- [ ] Decide on logout button placement (header? corner?)

---

**Next Steps**: Ready to implement! Let me know when you're ready and I'll start with installing packages and creating the authentication structure.
# Authentication Implementation Summary

## ✅ What Was Built

Google OAuth authentication has been successfully implemented for the Lab Calendar Automation web app. Users must now sign in with their **@brown.edu** account to access the application.

## 🏗️ Architecture

### Two Separate OAuth Flows

1. **User Authentication** (NEW)
   - Purpose: Verify user identity and check @brown.edu domain
   - Scopes: `profile` and `email` only
   - Credentials: Separate web application OAuth client

2. **Calendar API Access** (EXISTING)
   - Purpose: Create/delete calendar events
   - Uses existing `credentials.json` and `token.json`
   - Continues to work as before

This separation works around Brown's API restrictions since user accounts are only used for authentication, not calendar operations.

## 📁 Files Created

```
src/
  middleware/
    auth.js                 # Authentication middleware
  routes/
    auth.js                 # OAuth routes (login, callback, logout)
public/
  login.html                # "Sign in with Google" landing page
docs/
  AUTH_SETUP.md             # Step-by-step setup guide
  security/
    auth.md                 # Detailed architecture documentation
.env.example                # Environment variable template
```

## 📝 Files Modified

```
src/server.js               # Added session, passport, protected routes
public/index.html           # Added logout button and user info
public/script.js            # Added auth status check
public/csv-import.html      # Added logout button and user info
public/csv-import-script.js # Added auth status check
package.json                # Updated dev script with BYPASS_AUTH
```

## 🔐 Security Features

✅ **Case-sensitive domain check** - Only exact `@brown.edu` (lowercase) allowed  
✅ **Protected routes** - All pages require authentication  
✅ **Session-based** - 24-hour session duration  
✅ **Separated credentials** - User auth separate from calendar API  
✅ **Production safety** - Cannot bypass auth in production (enforced)  
✅ **Development mode** - `npm run dev` bypasses auth for quick testing  

## 🚀 Usage

### Production (Authentication Required):
```bash
npm start
```

### Development (No Authentication):
```bash
npm run dev
```

### Demo (Authentication + Simulated Calendar):
```bash
DEMO_MODE=true npm start
```

## 🎯 User Flow

1. User visits http://localhost:3000
2. Sees login page with "Sign in with Google" button
3. Clicks button → Google OAuth screen
4. Signs in with @brown.edu account
5. If valid → redirected to calendar app
6. If invalid domain → access denied error
7. User info displayed in top-right corner
8. "Logout" button available

## 📋 Setup Required

Before this works, you need to:

1. Create a new **Web Application** OAuth client in Google Cloud Console
2. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
3. Set environment variables in `.env`:
   ```env
   AUTH_CLIENT_ID=...
   AUTH_CLIENT_SECRET=...
   SESSION_SECRET=...
   ALLOWED_DOMAIN=brown.edu
   ```

See `docs/AUTH_SETUP.md` for detailed setup instructions.

## ⚙️ Environment Variables

```env
# Required for authentication
AUTH_CLIENT_ID              # OAuth web client ID
AUTH_CLIENT_SECRET          # OAuth web client secret
SESSION_SECRET              # Random secret for sessions
ALLOWED_DOMAIN              # brown.edu (case-sensitive)
AUTH_CALLBACK_URL           # OAuth redirect URI

# Development
BYPASS_AUTH                 # Set to 'true' to skip auth (dev only!)
DEMO_MODE                   # Set to 'true' to simulate calendar

# Server
PORT                        # Default: 3000
NODE_ENV                    # development or production
```

## 🧪 Testing Checklist

- [ ] Login page loads at root URL
- [ ] "Sign in with Google" button works
- [ ] @brown.edu accounts can sign in successfully
- [ ] Non-@brown.edu accounts are rejected
- [ ] User email appears in top-right after login
- [ ] Logout button works
- [ ] Session persists on page refresh
- [ ] `npm run dev` bypasses authentication
- [ ] Protected routes redirect to login when not authenticated
- [ ] Calendar features still work after authentication

## 📚 Documentation

- **Setup Guide**: `docs/AUTH_SETUP.md`
- **Architecture**: `docs/security/auth.md`
- **Environment Variables**: `.env.example`

## 🔄 Next Steps

1. Follow `docs/AUTH_SETUP.md` to configure OAuth credentials
2. Test locally with `npm start`
3. Verify authentication works with @brown.edu account
4. Test development mode with `npm run dev`
5. Deploy to production (Render.com) with proper environment variables

---

**Implementation Date**: November 6, 2025  
**Status**: ✅ Complete and ready for testing

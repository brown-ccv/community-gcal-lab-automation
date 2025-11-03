# Render.com Deployment Plan

This document outlines the rollout plan for deploying the Google Calendar automation tool as a web interface on Render.com (free tier).

## Phase 1: Preparation (30 minutes)

### 1.1 Build Web Interface ✅ COMPLETE
- [x] Create Express.js web server
- [x] Build HTML form with date/time/title inputs
- [x] Add input validation (client + server side)
- [x] Integrate existing auth.js and calendar.js modules
- [x] Add success/error feedback pages
- [x] Test locally at http://localhost:3000

**Status:** Web server running successfully at http://localhost:3000

### 1.2 Update OAuth Configuration
- [ ] Go to Google Cloud Console → Credentials
- [ ] Edit your OAuth 2.0 Client ID
- [ ] Add authorized redirect URIs:
  - `http://localhost:3000/oauth2callback` (for local testing)
  - `https://your-app-name.onrender.com/oauth2callback` (will update after Render deploy)
- [ ] Save changes

### 1.3 Prepare Repository
- [ ] Ensure all code is committed to git
- [ ] Create `.env.example` file (template for environment variables)
- [ ] Update `.gitignore` to exclude `.env`
- [ ] Push to GitHub (or create new repo if needed)

**Deliverables:**
- Working web interface locally
- GitHub repository ready for deployment
- OAuth credentials updated

---

## Phase 2: Initial Render Deployment (15 minutes)

### 2.1 Create Render Account
- [ ] Sign up at https://render.com (free, no credit card)
- [ ] Verify email
- [ ] Connect GitHub account

### 2.2 Deploy Web Service
- [ ] Click "New +" → "Web Service"
- [ ] Connect your GitHub repository
- [ ] Configure service:
  - **Name:** `gcal-lab-automation` (or your choice)
  - **Runtime:** Node
  - **Build Command:** `npm install`
  - **Start Command:** `npm start`
  - **Instance Type:** Free
- [ ] Add environment variables (in Render dashboard):
  - `NODE_ENV=production`
  - Upload `credentials.json` content as secret file (I'll show you how)
- [ ] Click "Create Web Service"
- [ ] Wait 3-5 minutes for first deploy

### 2.3 Update OAuth Redirect URI
- [ ] Note your Render URL (e.g., `https://gcal-lab-automation.onrender.com`)
- [ ] Go to Google Cloud Console → Credentials
- [ ] Edit OAuth client ID
- [ ] Add redirect URI: `https://gcal-lab-automation.onrender.com/oauth2callback`
- [ ] Save

**Deliverables:**
- Live web app at your Render URL
- OAuth configured for production

---

## Phase 3: First Authorization & Testing (10 minutes)

### 3.1 Authorize the App
- [ ] Visit your Render URL
- [ ] First visit will prompt for Google authorization
- [ ] Complete OAuth flow
- [ ] Verify token is stored (check Render logs)

### 3.2 Test Event Creation
- [ ] Fill in form with test data:
  - Date: Tomorrow's date
  - Title: "TEST-001"
  - Time: Current time + 1 hour
- [ ] Submit form
- [ ] Verify success message
- [ ] Check your Google Calendar for 3 test events
- [ ] Verify emails were sent

### 3.3 Test Delete Functionality
- [ ] Use delete form (or CLI) to remove test events
- [ ] Verify deletion successful
- [ ] Check calendar to confirm removal

**Deliverables:**
- Working web app creating real calendar events
- Delete functionality verified

---

## Phase 4: Lab Rollout (1-2 days)

### 4.1 Soft Launch (Day 1)
- [ ] Share URL with 2-3 tech-savvy lab members
- [ ] Have them create test events
- [ ] Gather feedback on:
  - Clarity of form fields
  - Any errors or confusion
  - Feature requests
- [ ] Monitor Render logs for errors
- [ ] Fix any issues found

### 4.2 Create User Documentation
- [ ] Write simple instructions (1-page guide):
  - What the tool does
  - When to use it
  - Step-by-step form instructions
  - What to expect (emails, calendar events)
  - Who to contact for help
- [ ] Include screenshots
- [ ] Add to shared lab folder/wiki

### 4.3 Full Launch (Day 2)
- [ ] Send lab-wide email with:
  - Brief description
  - Link to web app
  - Link to user guide
  - Your contact info for questions
- [ ] Monitor usage for first week
- [ ] Address questions/issues promptly

**Deliverables:**
- User documentation
- Lab-wide access
- Support plan

---

## Phase 5: Maintenance & Monitoring (Ongoing)

### 5.1 Weekly Checks (5 min/week)
- [ ] Check Render dashboard for:
  - Uptime status
  - Error logs
  - Usage metrics
- [ ] Verify events are being created correctly
- [ ] Check for any user-reported issues

### 5.2 Monthly Review (15 min/month)
- [ ] Review usage patterns
- [ ] Check if approaching free tier limits (highly unlikely)
- [ ] Gather feedback for improvements
- [ ] Update documentation if needed

### 5.3 Token Refresh
- [ ] Google OAuth tokens expire after 7 days of inactivity
- [ ] If app isn't used for a week, may need re-authorization
- [ ] Set calendar reminder to test monthly

**Deliverables:**
- Stable, monitored service
- Proactive issue resolution

---

## Phase 6: Enhancements (Future - Optional)

### Potential improvements based on usage:
- [ ] Add more follow-up interval options
- [ ] Support multiple attendees
- [ ] CSV import from FileMaker
- [ ] Admin dashboard to view all created events
- [ ] Email notifications on event creation
- [ ] Calendar preview before submitting
- [ ] Bulk delete by date range

---

## Rollback Plan (If Issues Arise)

If major issues occur during rollout:

1. **Immediate:** Post notice that tool is temporarily down
2. **Revert:** Use CLI version on shared lab computer as backup
3. **Debug:** Check Render logs for errors
4. **Fix:** Update code and redeploy
5. **Test:** Verify fix in staging before announcing
6. **Communicate:** Let lab know when resolved

---

## Success Metrics

After 2 weeks, evaluate:
- [ ] Number of lab members using the tool
- [ ] Number of events created successfully
- [ ] Error rate (aim for <5%)
- [ ] User satisfaction (quick survey)
- [ ] Time saved vs manual calendar creation

---

## Timeline Summary

| Phase | Duration | When |
|-------|----------|------|
| Phase 1: Preparation | 30 min | Before launch |
| Phase 2: Deployment | 15 min | Day 0 |
| Phase 3: Testing | 10 min | Day 0 |
| Phase 4: Rollout | 2 days | Day 1-2 |
| Phase 5: Maintenance | 5 min/week | Ongoing |

**Total setup time:** ~1 hour  
**Launch timeline:** 2 days from start to full lab access

---

## Cost Breakdown

| Item | Cost |
|------|------|
| Render.com hosting | $0/month (free tier) |
| Google Calendar API | $0 (free) |
| Domain name (optional) | $12/year (only if you want custom domain) |
| **Total** | **$0/month** |

---

## Support Plan

### For Users:
- **Email:** your-email@university.edu
- **Response time:** Within 24 hours
- **Office hours:** Tuesday/Thursday 2-4pm (or your availability)

### For You:
- **Render support:** Community forum + docs (free tier doesn't include support tickets)
- **Google API support:** Stack Overflow, documentation
- **Emergency:** Fall back to CLI version

---

## Next Steps

Ready to proceed? I'll build the web interface with:
- ✅ Clean, simple form
- ✅ Input validation
- ✅ Mobile-responsive design
- ✅ Clear success/error messages
- ✅ Render deployment configuration
- ✅ User guide template

Estimated build time: 45 minutes

**Should I start building the web interface now?**

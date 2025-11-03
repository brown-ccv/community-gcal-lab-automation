# Web Interface User Guide

Simple guide for lab members to use the Google Calendar automation tool.

## What This Tool Does

Creates three calendar check-in events automatically:
- **1-day check-in** (1 day after your base date)
- **10-day check-in** (10 days after your base date)
- **45-day check-in** (45 days after your base date)

All events are 30 minutes long and automatically sent to gregory.lazatin2006@gmail.com.

---

## How to Use

### Step 1: Open the Tool

Visit: **http://localhost:3000** (or the URL provided by your lab coordinator)

### Step 2: Fill Out the Form

**Required fields:**

1. **Base Date** 
   - Format: MM/DD/YYYY (e.g., 11/10/2025)
   - This is the reference date for calculating follow-ups

2. **Participant ID or Event Name**
   - Example: BURST-001, Subject-123, etc.
   - This appears in the event title

**Optional field:**

3. **Start Time**
   - Format: HH:MM in 24-hour time (e.g., 09:00, 14:30)
   - Leave blank to use default time (09:00)

### Step 3: Review the Preview

The form shows a preview of the three events that will be created. Double-check that everything looks correct.

### Step 4: Click "Create Events"

The tool will:
- ✅ Create three calendar events
- ✅ Send email invites to the participant
- ✅ Show a success message

**This takes about 5-10 seconds.** Please wait for the confirmation message.

---

## Example

**Input:**
- Base Date: `11/10/2025`
- Participant ID: `BURST-001`
- Start Time: `14:30`

**Result:** Three events created:
1. "BURST-001 - 1 day check-in" on **11/11/2025** at 2:30 PM
2. "BURST-001 - 10 day check-in" on **11/20/2025** at 2:30 PM
3. "BURST-001 - 45 day check-in" on **12/25/2025** at 2:30 PM

---

## Deleting Test Events

If you created events by mistake or for testing:

1. Scroll down to the **"Delete Test Events"** section
2. Enter the same **Base Date** and **Participant ID** you used
3. Click **"Delete Events"**
4. Confirm when prompted

This will remove all three check-in events.

---

## Common Questions

### What if I run it twice by accident?

No problem! The tool is **idempotent**, meaning it won't create duplicates. If you run it again with the same inputs, it will skip events that already exist.

### Can I change the time after creating events?

No, but you can:
1. Delete the events using the delete form
2. Create them again with the correct time

### What if I enter the wrong date?

The form validates dates automatically. You'll see an error if the format is wrong. Valid format: MM/DD/YYYY (e.g., 11/10/2025).

### What if I see an error message?

Common errors and solutions:

- **"Invalid date format"** → Use MM/DD/YYYY format
- **"Invalid time format"** → Use HH:MM format (00:00 - 23:59)
- **"Failed to create events"** → Contact your lab coordinator

### Where do the calendar invites go?

All invites are sent to: **gregory.lazatin2006@gmail.com**

Check:
- Your Google Calendar
- Your email inbox for the invite

### How long does it take?

Creating events takes **5-10 seconds**. Please wait for the green success message before closing the page.

---

## Tips

✅ **Double-check your dates** before clicking "Create Events"  
✅ **Wait for the confirmation** message  
✅ **Use the preview** to verify event titles  
✅ **Delete test events** when you're done testing  

---

## Need Help?

Contact: **gregory.lazatin2006@gmail.com**

Or check the full documentation in the project README.

# CSV Import Feature - Clarifying Questions

## **CSV Import Questions:**

### 1. CSV Structure
What columns will the FileMaker CSV have? For example:
- Participant ID (e.g., "B2STARTMIN10")?
- Base date?
- Protocol name (e.g., "BURST 2")?
- Any other relevant fields?

**Your Answer:**
Could you review the csv I uploaded in `src/data`? I should've clarified this while I prompted you about the new implementation. 

---

### 2. CSV Upload Method
Would you prefer:
- **Option A**: Upload CSV file through the web interface?
- **Option B**: Place CSV file in a folder and CLI reads it?
- **Option C**: Both options?

**Your Answer:**
Option C.

---

## **Event Naming Questions:**

### 3. Title Format
Looking at your examples, it seems like:
- "BURST 2 Pre-BURST Checklist" → ID is "B2STARTMIN10"
- "BURST 2 1-Day Prior Reminder" → ID is "B2STARTMIN1"

Should the calendar event titles be:
- **Option A**: `"B2STARTMIN10 - BURST 2 Pre-BURST Checklist"` (ID first)?
- **Option B**: `"BURST 2 Pre-BURST Checklist (B2STARTMIN10)"` (ID in parentheses)?
- **Option C**: Just the ID like `"B2STARTMIN10"`?

**Your Answer:**
Hard code what titles the csv headers correspond to. We'll be using only the human readable titles only.

---

### 4. Follow-up Event Naming
For the 1-day, 10-day, and 45-day follow-ups, should they be:
- **Option A**: `"B2STARTMIN10 - 1 day check-in"`?
- **Option B**: Keep the original protocol name: `"B2STARTMIN10 - BURST 2 1-Day Prior Reminder"`?
- **Option C**: Something else?

**Your Answer:**
I forgot to take notes on what these headers correspond to, but you should be able to infer in the CSV what the formula is to calculate these dates. 

---

## **Calendar & Attendee Questions:**

### 5. Attendee Email
You mentioned "No attendees? → put on specific calendar/or invite carelab gmail account"

- Should there be a **default calendar/email** (like carelab@gmail.com) if no participant email is provided?
- Or should events without attendees just be created on the authenticated user's calendar?

**Your Answer:**
Could you verify whether it'd be possible to just add events to a calendar without inviting attendees?

---

### 6. CSV Attendee Column
Will the CSV have a participant email column, or should we:
- Always use a default email?
- Make email optional in CSV?

**Your Answer:**
The answer to the previous question should answer this. We're gonna be hardcoding the event creation, but there won't be an email column in the csv.

---

## **Technical Feasibility:**

All of these features are **definitely possible** to implement! Here's what we'd need to add:

✅ **CSV parsing** - Use a library like `csv-parse` or `papaparse`  
✅ **File upload** - Add file input to web form or folder monitoring for CLI  
✅ **Flexible title formatting** - Modify `createEvents()` to accept ID + protocol name  
✅ **Default email fallback** - Add logic to use carelab email if no attendee provided  
✅ **Batch processing** - Loop through CSV rows and create events for each  

**Once you answer these questions, I can:**
1. Show you a sample CSV format
2. Update the code to handle CSV imports
3. Modify the naming convention
4. Add the default email fallback

---

## **IMPLEMENTATION PLAN - FINAL DECISIONS**

### **CSV Structure (from `src/data/P16_FM_dates.csv`):**
```csv
ID,IDSTATUS,B1STARTMIN10,B1STARTMIN1,B1STARTDATE,B2STARTMIN10,B2STARTMIN1,B2STARTDATE,...
"701","Active","8/5/2025","8/14/2025","8/15/2025","11/2/2025","11/11/2025","11/12/2025",...
```

### **Column to Event Title Mapping (Hardcoded):**
- `B1STARTMIN10` → "BURST 1 Pre-BURST Checklist"
- `B1STARTMIN1` → "BURST 1 1-Day Prior Reminder"
- `B1STARTDATE` → "BURST 1 Start Date"
- `B2STARTMIN10` → "BURST 2 Pre-BURST Checklist"
- `B2STARTMIN1` → "BURST 2 1-Day Prior Reminder"
- `B2STARTDATE` → "BURST 2 Start Date"
- `B3STARTMIN10` → "BURST 3 Pre-BURST Checklist"
- `B3STARTMIN1` → "BURST 3 1-Day Prior Reminder"
- `B3STARTDATE` → "BURST 3 Start Date"
- `B4STARTMIN10` → "BURST 4 Pre-BURST Checklist"
- `B4STARTMIN1` → "BURST 4 1-Day Prior Reminder"
- `B4STARTDATE` → "BURST 4 Start Date"

### **Implementation Strategy:**
✅ **Parse CSV dates directly** - Use dates as-is from FileMaker (no calculation needed)  
✅ **No attendees** - Events created on authenticated calendar without invitations  
✅ **Filter by status** - Only process rows where `IDSTATUS = "Active"`  
✅ **Use participant ID** - Include ID in event description/extended properties for tracking  
✅ **Default time** - Need to determine: What time should events be created? (10:00 AM default?)  
✅ **Batch processing** - Loop through CSV rows and create all events for each participant  

### **Event Configuration:**
✅ **Default Time:** 9:00 AM for all events  
✅ **Duration:** 30 minutes (9:00 AM - 9:30 AM)  
✅ **Timezone:** America/New_York

---

## **READY TO IMPLEMENT** ✅

All questions answered! Implementation will include:
1. CSV parser for FileMaker export format
2. Column-to-title mapping (hardcoded)
3. Filter for "Active" status participants
4. Create events at 9:00 AM with 30-minute duration
5. No attendees (calendar events only)
6. Both web upload and CLI file reading options

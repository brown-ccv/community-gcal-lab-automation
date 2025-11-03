# Design questions for Google Calendar lab invite scaffold

Thanks — this doc lists focused design questions so I can build a minimal prototype that matches what you'll demo to the lab.

Please answer the numbered questions you can; mark N/A if irrelevant.

1) Basic event fields
- 1.1 Event title (you said "Name will always be the same"). Please provide the exact title text to use for the demo.
    - Let's provide an "name" input field. We'll then append "check-in" to the title, with an identifer of the event (e.g. + " 10 day checkin"; + " 45 day checkin", etc.)
- 1.2 Time of day: do you want a fixed start time (e.g., 09:00) for all created events? If yes, provide the default start time and default duration in minutes.
    - Let's demo with an input that lets us set the time, with input validation (00:00 - 23:59)
- 1.3 Timezone: which timezone should the script use for the date/time (e.g., America/New_York)?
    - New York Time Zone

2) Input UX for the demo
- 2.1 CLI or simple web form? For the first demo, I built a CLI script. Is that fine, or do you prefer a short web form (I'll need to scaffold Express and a tiny page)?   
    - How much extra work would it take to create a web interface? If it would take a non-trivial amount of time, I'm ok with a CLI.
- 2.2 Input fields required for the demo: date (MM/DD/YYYY), optional start time (HH:MM), optional duration, optional attendee emails. Confirm which of these you want on the first pass.
    - Lets go with date (MM/DD/YYYY), optional start time (HH:MM), and event title. Duration should be fixed for each event (since I believe they're more reminders)

3) Attendees & notifications
- 3.1 Should attendees be invited in the demo, or should the demo only create events without sending invites (dry-run)?
    - Just invite me to each event. I'll provide the email.
- 3.2 If inviting, should the script immediately send email invites or create events quietly and wait for a manual publish step?
    - Let's automatically send the invites.

4) Calendar target & auth
- 4.1 Which calendarId should we use for the demo? (e.g., primary calendar of the test account, or a dedicated calendar email like lab-calendar@domain). If you don't have one yet, I can use a placeholder and instructions for you to insert credentials.
    - The placeholder idea sounds good.
- 4.2 Preferred auth method: OAuth2 with a user account (interactive consent) or a service account with domain delegation (requires admin)? If unsure, answer "I'll provide OAuth creds later".
    - I'll provide OAuth creds later.

5) Matching & idempotency
- 5.1 Do you want the script to be idempotent (i.e., re-run for the same date won't create duplicates)? If yes, what unique key should be used (e.g., lab_id from FileMaker)?
    - Let's do this. And then also having the option to reset/delete invites after test runs. The only thing I'd be concerned about with this approach is rate limiting, although we'll only be creating maybe 6-7 invites at a time so I doubt this'll be an issue.

6) Reminder behavior
- 6.1 For the demo, do you want reminder notifications (email/popup)? If yes, which offsets (e.g., 1 day before)?
    - Let's default to no reminder.

7) Follow-ups and post-event
- 7.1 Do you want the script to optionally create a follow-up event (e.g., 7 days later)? If yes, should it invite the same attendees?
    - The events that we create ARE the follow ups. The event scheduling we're automating is to create follow-up events based around a specific date.

8) Show/demo expectations
- 8.1 During the demo, do you want the script to actually create events on a real calendar (risk: spamming attendees) or to run in dry-run mode and print the event object/ICS to screen for manual copy?
    - Let's just invite to one calendar (mine) so that we can see how the actual script will function.

9) Language & deployment
- 9.1 Which language do you prefer for the prototype: Node.js (current scaffold) or Python? Node.js is ready; changing to Python is fine but will take extra time.
    - I'm language agnostic.
- 9.2 How will you run this after the demo? (Local laptop, scheduled server, or cloud function)
    - Local laptop runs for now.

10) Any constraints or policies
- 10.1 Any privacy or policy rules (no external emails, only internal domain addresses)?
    - This'll only be a local test, so this shouldn't be concerned.
- 10.2 Any quota or rate-limiting concerns I should code defensively for in the demo?
    - I briefly mentioned this early, but since we're creating relatively few invites, I'm not very concerned about this.

Extra: Example input format I plan to support for the demo (CLI):

  node src/cli.js --date 11/10/2025 --title "Lab Session" --time 09:00 --duration 120 --attendees "alice@example.com,bob@example.com" --dry-run

---

## Follow-up questions based on your answers

11) Event title structure clarification
- 11.1 You said to append "check-in" + identifier (e.g., "+ 10 day checkin"). Should the script create multiple events from a single run? For example:
 
  **Your answer:**
  Could we make a CLI thats interactive? Like you ask me to input a date, optional start time (store a default), and participant id (for title creation).

12) Duration per event
- 12.1 You said duration should be fixed per event type. What duration (in minutes) should check-in events use? (e.g., 30 min, 60 min?)
  
  **Your answer:** 30 minutes.

13) Idempotency key
- 13.1 To prevent duplicates when re-running, what unique identifier should I use? Options:
  
  **Your answer:** Base date + event title + follow-up type (e.g., "2025-11-10_BURST Study_10day")

14) Delete/reset command
- 14.1 Should I add a `--delete` flag to remove test events? Example usage:
  ```
  node src/cli.js --delete --date 11/10/2025 --title "BURST Study"
  ```
  This would find and delete all events matching that base date + title.
  
  **Your answer:** That's perfect.

15) Web UI vs CLI
- 15.1 A minimal web form would take ~30-45 minutes (Express + single HTML page with form submission). CLI is ~10 minutes to finish wiring up. Which do you prefer for the demo?
  
  **Your answer:** Let's just stick with the CLI for now.

16) Your email for demo
- 16.1 What email address should invites be sent to during the demo/testing?
  
  **Your answer:** gregory.lazatin2006@gmail.com
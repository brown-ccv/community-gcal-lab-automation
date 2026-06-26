## 1. Test Scaffolding (TDD)

- [x] 1.1 Write a failing frontend structure test in `test/event-calculations-ui.test.js` that reads `public/index.html` and asserts the presence of the collapsible `<details>` and `<summary>` panel with the title "View Active Date Calculation Rules & Formulas"

## 2. Frontend Layout Implementation

- [x] 2.1 Add the collapsible HTML `<details>` and `<summary>` layout structure in `public/index.html` directly below the CSV upload dropzone container
- [x] 2.2 Add the active date calculation rules, mapping columns, and weekend-shifting formulas for reminders, retention texts, and compliance tracking events inside the details panel, ensuring all emojis and timezone/time details are omitted

## 3. Frontend Styling Implementation

- [x] 3.1 Add modern responsive styling for the collapsible details accordion and summary elements in `public/styles.css` using the project's layout variables
- [x] 3.2 Add clear visual style groupings (e.g. borders, paddings, or background color adjustments) to differentiate between Reminder Calendar and Retention Calendar rules

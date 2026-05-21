// Form handling and API calls

// Global demo mode flag - will be set on page load
let IS_DEMO_MODE = true;
let currentCsvPreviewData = null;

function setSchedulerMode(mode, updateUrl = true) {
  const isCsv = mode === 'csv';
  const manualPanel = document.getElementById('step1-manual-panel');
  const csvPanel = document.getElementById('step1-csv-panel');
  const manualSwitch = document.getElementById('switch-manual');
  const csvSwitch = document.getElementById('switch-csv');
  const step1Title = document.getElementById('step1-title');
  const step1Help = document.getElementById('step1-help');

  if (manualPanel) {
    manualPanel.style.display = isCsv ? 'none' : 'block';
  }
  if (csvPanel) {
    csvPanel.style.display = isCsv ? 'block' : 'none';
  }

  if (manualSwitch) {
    manualSwitch.classList.toggle('is-active', !isCsv);
    manualSwitch.setAttribute('aria-selected', String(!isCsv));
  }
  if (csvSwitch) {
    csvSwitch.classList.toggle('is-active', isCsv);
    csvSwitch.setAttribute('aria-selected', String(isCsv));
  }

  if (step1Title) {
    step1Title.textContent = isCsv ? 'Import CSV Schedule' : 'Create Check-In Events';
  }
  if (step1Help) {
    step1Help.textContent = isCsv
      ? 'Upload a FileMaker CSV and preview all events before creating them.'
      : 'This creates 1-day, 10-day, and 45-day follow-up events from one base date.';
  }

  if (updateUrl) {
    const nextUrl = isCsv ? '/?mode=csv' : '/?mode=manual';
    window.history.replaceState({}, '', nextUrl);
  }
}

function initializeSchedulerModeSwitch() {
  const manualSwitch = document.getElementById('switch-manual');
  const csvSwitch = document.getElementById('switch-csv');
  if (!manualSwitch || !csvSwitch) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get('mode') === 'manual' ? 'manual' : 'csv';
  setSchedulerMode(initialMode, false);

  manualSwitch.addEventListener('click', () => setSchedulerMode('manual'));
  csvSwitch.addEventListener('click', () => setSchedulerMode('csv'));
}

function renderCsvPreview(preview) {
  const previewSection = document.getElementById('csv-preview-section');
  const totalParticipants = document.getElementById('csv-total-participants');
  const totalEvents = document.getElementById('csv-total-events');
  const eventTypesList = document.getElementById('csv-event-types-list');
  const sampleEvents = document.getElementById('csv-sample-events');
  const participantsToAddBox = document.getElementById('csv-participants-to-add-box');
  const participantsToAddSummary = document.getElementById('csv-participants-to-add-summary');
  const participantsToAddList = document.getElementById('csv-participants-to-add');
  const duplicatesBox = document.getElementById('csv-duplicates-box');
  const duplicateSummary = document.getElementById('csv-duplicate-summary');
  const duplicateParticipants = document.getElementById('csv-duplicate-participants');

  if (!previewSection || !totalParticipants || !totalEvents || !eventTypesList || !sampleEvents) {
    return;
  }

  totalParticipants.textContent = String(preview.summary.totalParticipants);
  totalEvents.textContent = String(preview.summary.importableEvents ?? preview.summary.totalEvents);

  eventTypesList.innerHTML = '';
  for (const [eventType, count] of Object.entries(preview.summary.eventsByType || {})) {
    const row = document.createElement('div');
    row.className = 'csv-event-type-item';
    row.innerHTML = `<span>${eventType}</span><strong>${count}</strong>`;
    eventTypesList.appendChild(row);
  }

  sampleEvents.innerHTML = '';
  (preview.sampleEvents || []).forEach((event) => {
    const card = document.createElement('div');
    card.className = 'csv-sample-event';
    card.innerHTML = `
      <div class="csv-sample-event-title">${event.title}</div>
      <div class="csv-sample-event-meta">Participant: ${event.participantId} | Date: ${event.date}</div>
    `;
    sampleEvents.appendChild(card);
  });

  // Render participants to be added
  if (participantsToAddBox && participantsToAddSummary && participantsToAddList) {
    const events = preview.events || preview.sampleEvents || [];
    const participantIds = new Set();
    
    // Collect unique participant IDs from events that will be created
    events.forEach((event) => {
      if (event.participantId) {
        participantIds.add(String(event.participantId));
      }
    });

    if (participantIds.size > 0) {
      participantsToAddSummary.textContent = `${participantIds.size} participant(s) will have new events created.`;
      participantsToAddList.innerHTML = '';

      [...participantIds]
        .sort((a, b) => String(a).localeCompare(String(b)))
        .forEach((participantId) => {
          const row = document.createElement('div');
          row.className = 'csv-event-type-item';
          row.innerHTML = `<span>Participant ${participantId}</span><strong>✓</strong>`;
          participantsToAddList.appendChild(row);
        });

      participantsToAddBox.style.display = 'block';
    } else {
      participantsToAddBox.style.display = 'none';
    }
  }
  
  if (duplicatesBox && duplicateSummary && duplicateParticipants) {
    const duplicateEvents = preview.duplicateSampleEvents || [];
    const duplicateTotal = preview.summary?.duplicateEvents ?? duplicateEvents.length;

    if (duplicateTotal > 0) {
      const countsByParticipant = new Map(
        Object.entries(preview.summary?.duplicateParticipants || {})
      );

      if (countsByParticipant.size === 0) {
        duplicateEvents.forEach((event) => {
          const key = event.participantId || 'Unknown';
          countsByParticipant.set(key, (countsByParticipant.get(key) || 0) + 1);
        });
      }

      duplicateSummary.textContent = `${duplicateTotal} event(s) already exist and will be skipped.`;
      duplicateParticipants.innerHTML = '';

      [...countsByParticipant.entries()]
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
        .forEach(([participantId, count]) => {
          const row = document.createElement('div');
          row.className = 'csv-event-type-item';
          row.innerHTML = `<span>Participant ${participantId}</span><strong>${count}</strong>`;
          duplicateParticipants.appendChild(row);
        });

      if (countsByParticipant.size === 0) {
        const row = document.createElement('div');
        row.className = 'csv-event-type-item';
        row.innerHTML = `<span>Duplicates found across additional participants</span><strong>${duplicateTotal}</strong>`;
        duplicateParticipants.appendChild(row);
      }

      duplicatesBox.style.display = 'block';
    } else {
      duplicatesBox.style.display = 'none';
    }
  }

  previewSection.style.display = 'block';
}

function resetCsvPreview() {
  const previewSection = document.getElementById('csv-preview-section');
  const fileInput = document.getElementById('csv-file-input');
  const reportBox = document.getElementById('csv-import-report');
  const participantsToAddBox = document.getElementById('csv-participants-to-add-box');
  const duplicatesBox = document.getElementById('csv-duplicates-box');
  if (previewSection) {
    previewSection.style.display = 'none';
  }
  if (reportBox) {
    reportBox.style.display = 'none';
    reportBox.innerHTML = '';
  }
  if (participantsToAddBox) {
    participantsToAddBox.style.display = 'none';
  }
  if (duplicatesBox) {
    duplicatesBox.style.display = 'none';
  }
  if (fileInput) {
    fileInput.value = '';
  }
  currentCsvPreviewData = null;
}

async function parseCsvFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.csv')) {
    showAlert('Please upload a valid CSV file.', 'error');
    return;
  }

  try {
    showAlert('Parsing CSV file...', 'info', true);
    const formData = new FormData();
    formData.append('csvFile', file);

    const response = await fetch('/api/csv/preview', {
      method: 'POST',
      body: formData,
      redirect: 'manual',
    });

    if (response.type === 'opaqueredirect' || response.status === 302) {
      window.location.href = '/login.html';
      return;
    }

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to preview CSV');
    }

    currentCsvPreviewData = { file, payload };
    renderCsvPreview(payload);
    const importable = payload.summary?.importableEvents ?? payload.summary?.totalEvents ?? 0;
    const duplicates = payload.summary?.duplicateEvents ?? 0;
    const totalAll = payload.summary?.totalEventsAll ?? importable;
    const message = duplicates > 0
      ? `CSV preview ready. Importable: ${importable} of ${totalAll}. Duplicates skipped in preview: ${duplicates}.`
      : `CSV preview ready. Importable events: ${importable}.`;
    showAlert(message, 'success');
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'error');
  }
}

async function importCsvFromStep1() {
  if (!currentCsvPreviewData) {
    showAlert('Upload and preview a CSV file first.', 'error');
    return;
  }

  const importBtn = document.getElementById('csv-import-btn');
  const originalText = importBtn ? importBtn.textContent : 'Create Events';
  if (importBtn) {
    importBtn.disabled = true;
    importBtn.innerHTML = '<span class="loading-spinner"></span>Creating events...';
  }

  try {
    const formData = new FormData();
    formData.append('csvFile', currentCsvPreviewData.file);

    const csvDemoMode = document.getElementById('csv-demo-mode');
    formData.append('demoMode', csvDemoMode?.checked ? 'true' : 'false');

    const response = await fetch('/api/csv/import', {
      method: 'POST',
      body: formData,
      redirect: 'manual',
    });

    if (response.type === 'opaqueredirect' || response.status === 302) {
      window.location.href = '/login.html';
      return;
    }

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Failed to import CSV');
    }

    if (payload.demo) {
      const previewEvents = currentCsvPreviewData?.payload?.events || [];
      const demoResults = {
        created: previewEvents.length,
        skipped: 0,
        errors: 0,
        details: previewEvents.map((event) => ({
          type: 'created',
          title: event.title,
          date: event.date,
          participantId: event.participantId,
        })),
      };

      displayCsvImportReport(demoResults);
      showAlert(payload.message || `Demo import complete. Would create: ${demoResults.created}, Skipped: 0, Errors: 0`, 'success', true);

      // Keep preview/report visible after demo import so users can review/download output.
      currentCsvPreviewData = null;
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
    } else {
      const created = payload.results?.created ?? 0;
      const skipped = payload.results?.skipped ?? 0;
      const errors = payload.results?.errors ?? 0;
      displayCsvImportReport(payload.results || {});
      showAlert(`CSV import complete. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`, errors > 0 ? 'error' : 'success', true);

      // Keep the preview panel visible so users can read/download the post-import report.
      currentCsvPreviewData = null;
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) {
        fileInput.value = '';
      }
    }
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    if (importBtn) {
      importBtn.disabled = false;
      importBtn.textContent = originalText;
    }
  }
}

function initializeInlineCsvFlow() {
  const uploadArea = document.getElementById('csv-upload-area');
  const fileInput = document.getElementById('csv-file-input');
  const cancelBtn = document.getElementById('csv-cancel-btn');
  const importBtn = document.getElementById('csv-import-btn');

  if (!uploadArea || !fileInput || !cancelBtn || !importBtn) {
    return;
  }

  uploadArea.addEventListener('click', () => fileInput.click());

  uploadArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadArea.classList.add('dragover');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
  });

  uploadArea.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = event.dataTransfer.files?.[0];
    if (file) {
      parseCsvFile(file);
    }
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (file) {
      parseCsvFile(file);
    }
  });

  cancelBtn.addEventListener('click', resetCsvPreview);
  importBtn.addEventListener('click', importCsvFromStep1);
}

// Helper function to check if a date falls on weekend
function isWeekend(dateStr) {
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

function getWeekdayLabel(dateStr) {
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
}

// Shift weekend dates to Friday
function shiftWeekendDate(dateStr) {
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  let wasShifted = false;
  const originalDate = dateStr;
  
  // If Saturday (6) or Sunday (0), shift back to Friday
  if (dayOfWeek === 6) {
    date.setDate(date.getDate() - 1);
    wasShifted = true;
  } else if (dayOfWeek === 0) {
    date.setDate(date.getDate() - 2);
    wasShifted = true;
  }
  
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  const newYear = date.getFullYear();
  const adjustedDate = `${newMonth}/${newDay}/${newYear}`;
  
  return { adjustedDate, wasShifted, originalDate };
}

// Check authentication status and show user info
(async function checkAuthStatus() {
  try {
    const response = await fetch('/api/auth/status');
    const data = await response.json();
    
    if (data.authenticated) {
      const userInfo = document.getElementById('user-info');
      const userEmail = document.getElementById('user-email');
      if (userInfo && userEmail) {
        userEmail.textContent = data.user.email;
        userInfo.style.display = 'block';
      }
    }
  } catch (error) {
    console.log('Auth check failed (may be in bypass mode):', error);
  }
})();

// Check demo mode status on page load
(async function checkDemoMode() {
  try {
    const response = await fetch('/api/demo-mode');
    const data = await response.json();
    IS_DEMO_MODE = data.demoMode;
    console.log('Demo mode:', IS_DEMO_MODE ? 'ENABLED' : 'DISABLED');
    
    // Show appropriate banner
    const banner = document.getElementById('mode-banner');
    if (banner) {
      if (IS_DEMO_MODE) {
        banner.style.backgroundColor = '#e3f2fd';
        banner.style.borderLeft = '4px solid #2196f3';
        banner.innerHTML = `
          <strong>Demo Mode</strong>
          <p style="margin: 0.5rem 0 0 0;">
            Events will be simulated. No actual calendar modifications will be made.
          </p>
        `;
        banner.style.display = 'block';
      } else {
        // Production UI: no live banner copy needed.
        banner.innerHTML = '';
        banner.style.display = 'none';
      }
    }

    applyDemoModeVisibility();
  } catch (error) {
    console.error('Failed to check demo mode, defaulting to demo:', error);
    IS_DEMO_MODE = true;
    applyDemoModeVisibility();
  }
})();

function applyDemoModeVisibility() {
  const csvDemoGroup = document.getElementById('csv-demo-mode-group');
  const manualDemoGroup = document.getElementById('manual-demo-mode-group');
  const clearDemoCard = document.getElementById('clear-demo-card');
  const undoCreateTitle = document.getElementById('undo-create-title');

  const hiddenStyle = IS_DEMO_MODE ? '' : 'none';

  if (csvDemoGroup) {
    csvDemoGroup.style.display = hiddenStyle;
  }

  if (manualDemoGroup) {
    manualDemoGroup.style.display = hiddenStyle;
  }

  if (clearDemoCard) {
    if (IS_DEMO_MODE) {
      clearDemoCard.style.display = hiddenStyle;
    } else {
      // Remove Step 3 card entirely in live mode so there is no visual gap.
      clearDemoCard.remove();
    }
  }

  if (undoCreateTitle) {
    undoCreateTitle.textContent = IS_DEMO_MODE
      ? 'Undo Last Event Creation'
      : 'Undo Last Event Creation';
  }

  if (!IS_DEMO_MODE) {
    const csvDemoCheckbox = document.getElementById('csv-demo-mode');
    const manualDemoCheckbox = document.getElementById('demoMode');
    if (csvDemoCheckbox) {
      csvDemoCheckbox.checked = false;
    }
    if (manualDemoCheckbox) {
      manualDemoCheckbox.checked = false;
    }
  }
}

// Show alert message
function showAlert(message, type = 'success', persist = false) {
  const alertDiv = document.getElementById('alert');
  alertDiv.className = `alert alert-${type}`;
  
  // Create close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = 'position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: inherit; opacity: 0.7; line-height: 1;';
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
  closeBtn.onclick = () => alertDiv.style.display = 'none';
  
  // Clear previous content and add message + close button
  alertDiv.innerHTML = '';
  const messageDiv = document.createElement('div');
  messageDiv.style.whiteSpace = 'pre-line';
  messageDiv.textContent = message;
  alertDiv.appendChild(messageDiv);
  alertDiv.appendChild(closeBtn);
  alertDiv.style.display = 'block';
  alertDiv.style.position = 'relative';
  
  // Keep errors visible until manually dismissed. Auto-hide only non-error messages.
  if (!persist) {
    const hideDelayMs = type === 'success' ? 15000 : type === 'info' ? 12000 : 0;
    if (hideDelayMs > 0) {
      setTimeout(() => {
        alertDiv.style.display = 'none';
      }, hideDelayMs);
    }
  }
  
  // Scroll to top to show alert
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validate date format (MM/DD/YYYY)
function validateDate(dateStr) {
  const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return false;
  
  const [, month, day, year] = match;
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  const y = parseInt(year, 10);
  
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 2000 || y > 2100) return false;
  
  return true;
}

// Validate time format (HH:MM)
function validateTime(timeStr) {
  if (!timeStr) return true; // Optional field
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  
  const [, hour, minute] = match;
  const h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;
  
  return true;
}

// Calculate event dates from base date
function calculateEventDates(baseDateStr) {
  const [month, day, year] = baseDateStr.split('/').map(Number);
  const baseDate = new Date(year, month - 1, day);
  
  const followUps = [
    { label: '1 day', days: 1 },
    { label: '10 day', days: 10 },
    { label: '45 day', days: 45 }
  ];
  
  return followUps.map(followUp => {
    const eventDate = new Date(baseDate);
    eventDate.setDate(baseDate.getDate() + followUp.days);
    const formattedDate = `${eventDate.getMonth() + 1}/${eventDate.getDate()}/${eventDate.getFullYear()}`;
    return { label: followUp.label, date: formattedDate };
  });
}

// Update event preview when title changes
document.getElementById('title')?.addEventListener('input', (e) => {
  const title = e.target.value || 'Your Title';
  document.getElementById('preview-1day').textContent = `${title} - 1 day check-in`;
  document.getElementById('preview-10day').textContent = `${title} - 10 day check-in`;
  document.getElementById('preview-45day').textContent = `${title} - 45 day check-in`;
});

// Update email preview when attendee email changes
document.getElementById('attendeeEmail')?.addEventListener('input', (e) => {
  const email = e.target.value || 'participant@example.com';
  document.getElementById('preview-email').textContent = email;
});

// Handle create events form
document.getElementById('create-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const submitBtn = document.getElementById('submit-btn');
  const originalText = submitBtn.textContent;
  
  // Get form values
  const baseDate = document.getElementById('baseDate').value.trim();
  const title = document.getElementById('title').value.trim();
  const attendeeEmail = document.getElementById('attendeeEmail').value.trim();
  const demoMode = document.getElementById('demoMode').checked;
  
  // Validation
  if (!validateDate(baseDate)) {
    showAlert('Invalid date format. Please use MM/DD/YYYY (e.g., 11/10/2025)', 'error');
    return;
  }
  
  if (!attendeeEmail) {
    showAlert('Participant email is required.', 'error');
    return;
  }
  
  // Disable button and show loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="loading-spinner"></span>Creating events...';
  
  try {
    if (IS_DEMO_MODE) {
      // DEMO MODE: Simulate event creation without actual API calls
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      
      // Calculate event dates
      const eventDates = calculateEventDates(baseDate);
      const participantId = attendeeEmail.split('@')[0];
      
      // Generate report for demo mode with shifted dates
      const reportData = {
        created: 3,
        skipped: 0,
        errors: 0,
        details: eventDates.map(ed => {
          const shifted = shiftWeekendDate(ed.date);
          return {
            type: 'created',
            title: `${participantId} - ${title} - ${ed.label} check-in`,
            date: shifted.adjustedDate,
            wasShifted: shifted.wasShifted,
            originalDate: shifted.originalDate,
            shiftedTo: shifted.shiftedTo,
            participantId
          };
        })
      };
      
      let message = `[DEMO] Would have created 3 events for "${title}":\n\n`;
      
      reportData.details.forEach(detail => {
        const shiftInfo = detail.wasShifted
          ? ` (moved from ${getWeekdayLabel(detail.originalDate)} to ${detail.shiftedTo})`
          : '';
        message += `${detail.title}\n`;
        message += `   Date: ${detail.date}${shiftInfo} at 9:00 AM\n`;
        message += `   Duration: 30 minutes\n`;
        message += `   Attendee: ${attendeeEmail}\n`;
        message += `   Description: Automated check-in event created for ${title}\n\n`;
      });
      
      message += `${demoMode ? 'Demo mode: ON (events can be bulk-deleted)\n\n' : ''}`;
      message += `Note: This is a demo interface. Run with 'npm start' for full functionality.`;
      
      // Display report with download button
      displayManualEntryReport(reportData, title);
      
      showAlert(message, 'success', true); // Persist in demo mode
    } else {
      // REAL MODE: Make actual API call
      const response = await fetch('/create-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseDate, title, attendeeEmail, demoMode }),
        redirect: 'manual',
      });
      
      // Handle redirect to authorization
      if (response.type === 'opaqueredirect' || response.status === 302) {
        window.location.href = '/authorize';
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create events');
      }
      
      // Count successes
      const created = data.results.filter(r => r.type === 'created').length;
      const skipped = data.results.filter(r => r.type === 'skipped').length;
      const errors = data.results.filter(r => r.type === 'error').length;
      const shifted = data.results.filter(r => r.wasShifted).length;
      const shiftedByDestination = data.results
        .filter((r) => r.wasShifted && r.shiftedTo)
        .reduce((acc, r) => {
          acc[r.shiftedTo] = (acc[r.shiftedTo] || 0) + 1;
          return acc;
        }, {});
      
      let message = '';
      if (created > 0) {
        message = `Successfully created ${created} event(s)!`;
        if (created === 3) {
          message += ' Check your calendar and email for the invites:\n\n';
          data.results.filter(r => r.type === 'created').forEach(r => {
            const shiftNote = r.wasShifted
              ? ` (moved from ${getWeekdayLabel(r.originalDate)} to ${r.shiftedTo})`
              : '';
            message += `• ${r.title}\n  Date: ${r.date}${shiftNote}\n`;
          });
        }
        
        if (shifted > 0) {
          const destinationSummary = Object.entries(shiftedByDestination)
            .map(([day, count]) => `${count} to ${day}`)
            .join(', ');
          message += `\nNote: ${shifted} event(s) were shifted (${destinationSummary}).`;
        }
        
        message += '\n\nCheck your calendar and email.';

        const createdDetails = data.results
          .filter((r) => r.type === 'created')
          .map((r) => ({
            title: r.title,
            date: r.date,
            wasShifted: Boolean(r.wasShifted),
            shiftedTo: r.shiftedTo || null,
            originalDate: r.originalDate || null,
          }));

        if (createdDetails.length > 0) {
          displayManualEntryReport({
            created: createdDetails.length,
            details: createdDetails,
          }, title);
        }
      } else if (skipped > 0) {
        message = `All ${skipped} event(s) already exist. No duplicates created.`;
      }
      
      if (errors > 0) {
        message += ` Warning: ${errors} event(s) failed to create.`;
      }
      
      showAlert(message, errors > 0 ? 'error' : 'success', true); // Persist
    }
    
    // Clear form on success
    document.getElementById('create-form').reset();
    document.getElementById('preview-1day').textContent = 'Your Title - 1 day check-in';
    document.getElementById('preview-10day').textContent = 'Your Title - 10 day check-in';
    document.getElementById('preview-45day').textContent = 'Your Title - 45 day check-in';
    document.getElementById('preview-email').textContent = 'participant@example.com';
    
  } catch (error) {
    console.error('Error:', error);
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

// Handle clear all demo events button
document.getElementById('clear-demo-btn')?.addEventListener('click', async () => {
  const clearBtn = document.getElementById('clear-demo-btn');
  const originalText = clearBtn.textContent;
  
  // Confirm action
  if (!confirm('Are you sure you want to delete ALL demo mode events?\n\nThis will permanently remove all events that were created with "Demo Mode" enabled.\n\nThis action cannot be undone.')) {
    return;
  }
  
  // Disable button and show loading
  clearBtn.disabled = true;
  clearBtn.innerHTML = '<span class="loading-spinner"></span>Clearing demo events...';
  
  try {
    if (IS_DEMO_MODE) {
      // DEMO MODE: Simulate clearing events without actual API calls
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay
      
      const message = `[DEMO] Would have cleared all demo mode events from calendar\n\n` +
                     `Note: This is a demo interface. Run with 'npm start' for full functionality.`;
      
      showAlert(message, 'success', true); // Persist in demo mode
    } else {
      // REAL MODE: Make actual API call
      const response = await fetch('/clear-demo-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        redirect: 'manual',
      });
      
      // Handle redirect to authorization
      if (response.type === 'opaqueredirect' || response.status === 302) {
        window.location.href = '/authorize';
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to clear demo events');
      }
      
      let message = '';
      if (data.deleted > 0) {
        message = `Successfully deleted ${data.deleted} demo event(s).`;
      } else {
        message = `No demo events found to delete.`;
      }
      
      if (data.errors > 0) {
        message += ` Warning: ${data.errors} event(s) failed to delete.`;
        console.error('Error details:', data.errorDetails);
      }
      
      showAlert(message, data.errors > 0 ? 'error' : 'success', true); // Persist
    }
    
  } catch (error) {
    console.error('Error:', error);
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    clearBtn.disabled = false;
    clearBtn.textContent = originalText;
  }
});

// Undo last creation handler
document.getElementById('undo-last-create-btn').addEventListener('click', async function() {
  if (!confirm('This will undo your most recent event creation/import batch.\n\nOnly events created in that exact batch will be deleted.\n\nContinue?')) {
    return;
  }

  const undoBtn = this;
  const originalText = undoBtn.textContent;
  undoBtn.disabled = true;
  undoBtn.textContent = 'Undoing...';

  try {
    if (IS_DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showAlert('[DEMO] Would have undone the most recent creation batch', 'success', true); // Persist in demo mode
      return;
    }

    const response = await fetch('/api/undo-last-creation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'manual'
    });

    if (response.status === 302 || response.status === 0) {
      window.location.href = '/authorize';
      return;
    }

    if (!response.ok) {
      let errorMessage = 'Failed to undo event creation';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // Response wasn't JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Server returned an invalid response. Please try again.');
    }
    
    if (data.success) {
      const { results } = data;
      
      let message = '';
      if (results.undone > 0) {
        const sourceLabel = data.source === 'csv-import' ? 'CSV import' : 'manual create';
        message = `Successfully undid ${results.undone} event(s) from your last ${sourceLabel} batch.\n\n`;
        if (results.eventsTargeted.length > 0) {
          message += 'Batch events:\n';
          results.eventsTargeted.slice(0, 5).forEach(e => {
            message += `• ${e.summary || e.eventId}\n`;
          });
          if (results.eventsTargeted.length > 5) {
            message += `... and ${results.eventsTargeted.length - 5} more`;
          }
        }
      } else {
        message = 'No events were undone.';
      }
      
      if (results.errors > 0) {
        message += `\n\nWarning: ${results.errors} event(s) failed to undo. You can retry.`;
        console.error('Error details:', results.errorDetails);
      }
      
      showAlert(message, results.errors > 0 ? 'error' : 'success', true); // Persist
    }
    
  } catch (error) {
    console.error('Error:', error);
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    undoBtn.disabled = false;
    undoBtn.textContent = originalText;
  }
});

// Delete events by participant handler
document.getElementById('delete-by-participant-btn').addEventListener('click', async function() {
  const input = document.getElementById('participant-ids-input');
  const participantIdsText = input?.value?.trim();
  
  if (!participantIdsText) {
    showAlert('Please enter at least one participant ID.', 'error');
    return;
  }

  // Parse participant IDs (comma-separated)
  const participantIds = participantIdsText
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  if (participantIds.length === 0) {
    showAlert('Please enter valid participant ID(s).', 'error');
    return;
  }

  // Confirmation dialog
  const message = `This will permanently delete ALL events for ${participantIds.length} participant(s):\n\n${participantIds.join(', ')}\n\nThis action cannot be undone through the UI, but you can use the "Undo Last Event Creation" button if needed.\n\nContinue?`;
  if (!confirm(message)) {
    return;
  }

  const deleteBtn = this;
  const originalText = deleteBtn.textContent;
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<span class="loading-spinner"></span>Deleting events...';

  try {
    if (IS_DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      const message = `[DEMO] Would have deleted all events for participant(s): ${participantIds.join(', ')}\n\n` +
                     `Note: This is a demo interface. Run with 'npm start' for full functionality.`;
      showAlert(message, 'success', true);
      input.value = '';
      return;
    }

    const response = await fetch('/api/delete-by-participant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participantIds }),
      redirect: 'manual'
    });

    if (response.status === 302 || response.status === 0) {
      window.location.href = '/authorize';
      return;
    }

    if (!response.ok) {
      let errorMessage = 'Failed to delete events';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      throw new Error('Server returned an invalid response. Please try again.');
    }
    
    if (data.success) {
      let message = '';
      if (data.deleted > 0) {
        message = `Successfully deleted ${data.deleted} event(s) for ${data.participantsProcessed} participant(s).\n\n`;
        message += `Participants: ${participantIds.join(', ')}\n\n`;
        message += `You can use "Undo Last Event Creation" to restore these events if needed.`;
      } else {
        message = `No events found for participant(s): ${participantIds.join(', ')}`;
      }
      
      if (data.errors > 0) {
        message += `\n\nWarning: ${data.errors} error(s) occurred. Details in console.`;
        console.error('Error details:', data.errorDetails);
      }
      
      showAlert(message, data.errors > 0 ? 'error' : 'success', true);
      input.value = '';
    }
    
  } catch (error) {
    console.error('Error:', error);
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.textContent = originalText;
  }
});

// Show success message if redirected after authorization
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('authorized') === 'true') {
  showAlert('Successfully authorized! You can now create calendar events.', 'success', true); // Persist
  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname);
}

initializeSchedulerModeSwitch();
initializeInlineCsvFlow();

// Generate report for manual entry
function generateManualEntryReport(reportData, projectTitle) {
  const timestamp = new Date().toLocaleString();
  const shiftedEvents = reportData.details.filter((event) => event.wasShifted);
  let report = `Manual Entry Report\n`;
  report += `Project: ${projectTitle}\n`;
  report += `Generated: ${timestamp}\n`;
  report += `${'='.repeat(60)}\n\n`;
  
  report += `SUMMARY:\n`;
  report += `Total Events: ${reportData.created}\n`;
  report += `Weekend Shifts: ${shiftedEvents.length}\n`;
  if (shiftedEvents.length > 0) {
    const shiftedByDestination = shiftedEvents.reduce((acc, event) => {
      acc[event.shiftedTo || 'Unknown'] = (acc[event.shiftedTo || 'Unknown'] || 0) + 1;
      return acc;
    }, {});
    report += `Moved To: ${Object.entries(shiftedByDestination).map(([day, count]) => `${day} (${count})`).join(', ')}\n`;
  }
  report += `\n`;
  
  report += `EVENTS TO BE CREATED:\n`;
  report += `${'-'.repeat(60)}\n`;
  reportData.details.forEach(event => {
    report += `Event: ${event.title}\n`;
    report += `Date: ${event.date}`;
    if (event.wasShifted) {
      report += ` (moved from ${getWeekdayLabel(event.originalDate)} to ${event.shiftedTo})`;
    }
    report += `\nTime: 9:00 AM - 9:30 AM\n\n`;
  });
  
  return report;
}

// Display manual entry report with download button
function displayManualEntryReport(reportData, projectTitle) {
  const formCard = document.querySelector('.card');
  if (!formCard) return;
  
  // Remove any existing report
  const existingReport = document.getElementById('manualEntryReport');
  if (existingReport) {
    existingReport.remove();
  }
  
  // Create report container
  const reportContainer = document.createElement('div');
  reportContainer.id = 'manualEntryReport';
  reportContainer.style.cssText = 'margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; border: 2px solid #4caf50;';
  
  const reportTitle = document.createElement('h3');
  reportTitle.textContent = 'Event Creation Report';
  reportTitle.style.marginTop = '0';
  reportContainer.appendChild(reportTitle);
  
  // Add summary
  const summary = document.createElement('div');
  summary.style.cssText = 'margin: 15px 0; padding: 15px; background: white; border-radius: 4px;';
  const shiftedEvents = reportData.details.filter((event) => event.wasShifted);
  const shiftedByDestination = shiftedEvents.reduce((acc, event) => {
    acc[event.shiftedTo || 'Unknown'] = (acc[event.shiftedTo || 'Unknown'] || 0) + 1;
    return acc;
  }, {});
  summary.innerHTML = `
    <strong>Summary:</strong><br>
    • Total Events: ${reportData.created}<br>
    ${shiftedEvents.length > 0 ? `• Weekend Shifts: ${shiftedEvents.length}<br>` : ''}
    ${shiftedEvents.length > 0 ? `• Moved To: ${Object.entries(shiftedByDestination).map(([day, count]) => `${day} (${count})`).join(', ')}<br>` : ''}
  `;
  reportContainer.appendChild(summary);
  
  // Add event list
  const eventList = document.createElement('div');
  eventList.style.cssText = 'margin: 15px 0; padding: 15px; background: white; border-radius: 4px;';
  
  let eventHTML = '<strong>Events:</strong><br><br>';
  reportData.details.forEach(event => {
    const shiftNote = event.wasShifted ? ` <span style="color: #ff9800;">(moved from ${getWeekdayLabel(event.originalDate)} to ${event.shiftedTo})</span>` : '';
    eventHTML += `• ${event.title}<br>`;
    eventHTML += `  Date: ${event.date}${shiftNote}<br>`;
    eventHTML += `  Time: 9:00 AM - 9:30 AM<br><br>`;
  });
  
  eventList.innerHTML = eventHTML;
  reportContainer.appendChild(eventList);
  
  // Generate report text
  const reportText = generateManualEntryReport(reportData, projectTitle);
  
  // Add download button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download Report (TXT)';
  downloadBtn.className = 'btn btn-secondary';
  downloadBtn.style.marginTop = '15px';
  downloadBtn.onclick = () => downloadReportFile(reportText, 'manual-entry');
  reportContainer.appendChild(downloadBtn);
  
  // Insert after the form card
  formCard.parentNode.insertBefore(reportContainer, formCard.nextSibling);
}

function generateCsvImportReport(results) {
  const timestamp = new Date().toLocaleString();
  const details = Array.isArray(results.details) ? results.details : [];
  const createdEvents = details.filter((event) => event.type === 'created');
  const skippedEvents = details.filter((event) => event.type === 'skipped');
  const errorEvents = details.filter((event) => event.type === 'error');
  const shiftedEvents = createdEvents.filter((event) => event.wasShifted || (event.originalDate && event.originalDate !== event.date));
  const shiftedByDestination = shiftedEvents.reduce((acc, event) => {
    const key = event.shiftedTo || (event.originalDate ? (getWeekdayLabel(event.originalDate) === 'Saturday' ? 'Friday' : 'Monday') : 'Unknown');
    acc[key] = acc[key] || [];
    acc[key].push(event);
    return acc;
  }, {});

  let report = `CSV Import Report\n`;
  report += `Generated: ${timestamp}\n`;
  report += `${'='.repeat(60)}\n\n`;
  report += `SUMMARY:\n`;
  report += `Created: ${results.created || 0}\n`;
  report += `Skipped (duplicates): ${results.skipped || 0}\n`;
  report += `Errors: ${results.errors || 0}\n\n`;

  if (shiftedEvents.length > 0) {
    report += `WEEKEND-SHIFTED EVENTS:\n`;
    report += `${'-'.repeat(60)}\n`;
    ['Friday', 'Monday'].forEach((day) => {
      const grouped = shiftedByDestination[day] || [];
      if (grouped.length === 0) return;
      report += `Moved to ${day} (${grouped.length} event(s)):\n`;
      grouped.forEach((event) => {
        report += `• ${event.title}\n`;
        report += `  Moved from ${getWeekdayLabel(event.originalDate)} to ${event.shiftedTo || day}\n`;
        report += `  Date: ${event.date}\n`;
      });
      report += `\n`;
    });
  }

  if (createdEvents.length > 0) {
    report += `CREATED EVENTS:\n`;
    report += `${'-'.repeat(60)}\n`;
    createdEvents.forEach((event) => {
      report += `• ${event.title}\n`;
      report += `  Date: ${event.date}\n`;
    });
    report += `\n`;
  }

  if (skippedEvents.length > 0) {
    report += `SKIPPED DUPLICATES:\n`;
    report += `${'-'.repeat(60)}\n`;
    skippedEvents.forEach((event) => {
      report += `• ${event.participantId || 'Unknown'} - ${event.title} (${event.date})\n`;
    });
    report += `\n`;
  }

  if (errorEvents.length > 0) {
    report += `ERRORS:\n`;
    report += `${'-'.repeat(60)}\n`;
    errorEvents.forEach((event) => {
      report += `• ${event.participantId || 'Unknown'} - ${event.title}: ${event.error}\n`;
    });
  }

  return report;
}

function displayCsvImportReport(results) {
  const reportContainer = document.getElementById('csv-import-report');
  if (!reportContainer) {
    return;
  }

  const reportText = generateCsvImportReport(results);
  const created = results.created || 0;
  const skipped = results.skipped || 0;
  const errors = results.errors || 0;
  const shiftedEvents = Array.isArray(results.details)
    ? results.details.filter((event) => event.type === 'created' && (event.wasShifted || (event.originalDate && event.originalDate !== event.date)))
    : [];
  const shiftedByDestination = shiftedEvents.reduce((acc, event) => {
    const destination = event.shiftedTo || (event.originalDate ? (getWeekdayLabel(event.originalDate) === 'Saturday' ? 'Friday' : 'Monday') : 'Unknown');
    acc[destination] = acc[destination] || [];
    acc[destination].push(event);
    return acc;
  }, {});

  const weekendShiftHtml = shiftedEvents.length > 0
    ? `
      <div style="margin-top: 12px; padding: 12px; border-radius: 8px; background: #fff8e8; border: 1px solid #f2c97d;">
        <strong>Weekend-shifted events</strong>
        <p style="margin: 6px 0 0 0; font-size: 0.92rem; color: var(--text-700);">
          ${shiftedEvents.length} event(s) were moved to weekday dates.
        </p>
        ${['Friday', 'Monday'].map((day) => {
          const grouped = shiftedByDestination[day] || [];
          if (grouped.length === 0) return '';
          return `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(47, 134, 217, 0.16);">
              <strong>Moved to ${day}</strong>
              <ul style="margin: 8px 0 0 18px; padding: 0; color: var(--text-900);">
                ${grouped.map((event) => `
                  <li style="margin-bottom: 6px;">
                    <strong>${event.title}</strong><br>
                    Moved from ${getWeekdayLabel(event.originalDate)} to ${event.shiftedTo || (getWeekdayLabel(event.originalDate) === 'Saturday' ? 'Friday' : 'Monday')}
                  </li>
                `).join('')}
              </ul>
            </div>
          `;
        }).join('')}
      </div>
    `
    : '';

  reportContainer.innerHTML = `
    <strong>Import Summary</strong>
    <p><small>Created: ${created} | Skipped: ${skipped} | Errors: ${errors}</small></p>
    ${weekendShiftHtml}
    <details>
      <summary>View detailed report</summary>
      <pre style="white-space: pre-wrap; margin-top: 8px;">${reportText}</pre>
    </details>
    <button type="button" class="btn btn-secondary" id="csv-report-download-btn" style="margin-top: 12px;">Download Report (TXT)</button>
  `;
  const downloadBtn = document.getElementById('csv-report-download-btn');
  if (downloadBtn) {
    downloadBtn.onclick = () => downloadReportFile(reportText, 'csv-import');
  }
  reportContainer.style.display = 'block';
}

// Download report as text file
function downloadReportFile(reportText, prefix) {
  const blob = new Blob([reportText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prefix}-report-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

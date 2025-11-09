// Global state
let IS_DEMO_MODE = false;
let currentPreviewData = null;

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

// Helper function to check if a date falls on weekend
function isWeekendDate(dateStr) {
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

// Shift weekend dates to the previous Friday
function shiftWeekendToFriday(dateStr) {
  const [month, day, year] = dateStr.split('/').map(s => parseInt(s.trim(), 10));
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
  
  let wasShifted = false;
  const originalDate = dateStr;
  
  // If Saturday (6), shift back 1 day to Friday
  if (dayOfWeek === 6) {
    date.setDate(date.getDate() - 1);
    wasShifted = true;
  }
  // If Sunday (0), shift back 2 days to Friday
  else if (dayOfWeek === 0) {
    date.setDate(date.getDate() - 2);
    wasShifted = true;
  }
  
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  const newYear = date.getFullYear();
  const adjustedDate = `${newMonth}/${newDay}/${newYear}`;
  
  return { adjustedDate, wasShifted, originalDate };
}

// Check demo mode on page load
async function checkDemoMode() {
  try {
    const response = await fetch('/api/demo-mode');
    const data = await response.json();
    IS_DEMO_MODE = data.demoMode;
    
    const banner = document.getElementById('mode-banner');
    if (banner) {
      if (IS_DEMO_MODE) {
        banner.style.backgroundColor = '#e3f2fd';
        banner.style.borderLeft = '4px solid #2196f3';
        banner.innerHTML = `
          <strong>🧪 Demo Mode</strong>
          <p style="margin: 0.5rem 0 0 0;">
            Events will be simulated. No actual calendar modifications will be made.
          </p>
        `;
      } else {
        banner.style.backgroundColor = '#e8f5e9';
        banner.style.borderLeft = '4px solid #4caf50';
        banner.innerHTML = `
          <strong>✅ Live Mode</strong>
          <p style="margin: 0.5rem 0 0 0;">
            Connected to Google Calendar API. Events created here will be <strong>real calendar invites</strong> sent to participants.
          </p>
        `;
      }
      banner.style.display = 'block';
    }
  } catch (error) {
    console.error('Failed to check demo mode:', error);
  }
}

checkDemoMode();

// File upload handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');

uploadArea.addEventListener('click', () => {
  fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

async function handleFile(file) {
  if (!file.name.endsWith('.csv')) {
    showAlert('Please upload a CSV file', 'error');
    return;
  }
  
  const formData = new FormData();
  formData.append('csvFile', file);
  
  try {
    showAlert('📖 Parsing CSV file...', 'info');
    
    const response = await fetch('/api/csv/preview', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to parse CSV');
    }
    
    const data = await response.json();
    currentPreviewData = { file, data };
    
    displayPreview(data);
    hideAlert();
    
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'error');
  }
}

function displayPreview(data) {
  // Show preview section
  previewSection.classList.add('show');
  uploadArea.style.display = 'none';
  
  // Update stats
  document.getElementById('totalParticipants').textContent = data.summary.totalParticipants;
  document.getElementById('totalEvents').textContent = data.summary.totalEvents;
  
  // Update event types list
  const eventTypesList = document.getElementById('eventTypesList');
  eventTypesList.innerHTML = '';
  
  for (const [type, count] of Object.entries(data.summary.eventsByType)) {
    const item = document.createElement('div');
    item.className = 'event-type-item';
    item.innerHTML = `
      <span>${type}</span>
      <strong>${count}</strong>
    `;
    eventTypesList.appendChild(item);
  }
  
  // Update sample events
  const sampleEvents = document.getElementById('sampleEvents');
  sampleEvents.innerHTML = '';
  
  for (const event of data.sampleEvents) {
    const eventDiv = document.createElement('div');
    eventDiv.className = 'sample-event';
    eventDiv.innerHTML = `
      <div class="sample-event-title">${event.title}</div>
      <div class="sample-event-meta">
        Participant: ${event.participantId} | Date: ${event.date}
      </div>
    `;
    sampleEvents.appendChild(eventDiv);
  }
}

function resetUpload() {
  uploadArea.style.display = 'block';
  previewSection.classList.remove('show');
  fileInput.value = '';
  currentPreviewData = null;
}

async function importCSV() {
  if (!currentPreviewData) {
    showAlert('No file selected', 'error');
    return;
  }
  
  const demoModeChecked = document.getElementById('demoMode').checked;
  const importBtn = document.getElementById('importBtn');
  
  // Disable button
  importBtn.disabled = true;
  importBtn.textContent = 'Importing...';
  
  const formData = new FormData();
  formData.append('csvFile', currentPreviewData.file);
  formData.append('demoMode', demoModeChecked);
  
  try {
    if (IS_DEMO_MODE) {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const { summary, sampleEvents } = currentPreviewData.data;
      
      // Generate demo report data (simulate all events with proper date shifting)
      const demoResults = {
        created: summary.totalEvents,
        skipped: 0,
        errors: 0,
        details: currentPreviewData.data.events.map(event => {
          const shifted = shiftWeekendToFriday(event.date);
          return {
            type: 'created',
            participantId: event.participantId,
            title: `${event.participantId} - ${event.title}`,
            date: shifted.adjustedDate,
            wasShifted: shifted.wasShifted,
            originalDate: shifted.originalDate
          };
        })
      };
      
      let message = `[DEMO] Would have created ${summary.totalEvents} events for ${summary.totalParticipants} participants at 9:00 AM\n\n`;
      
      // Show sample event details (with shifted dates)
      message += `Sample events that would be created:\n\n`;
      const shiftedSamples = sampleEvents.slice(0, 3).map(event => {
        const shifted = shiftWeekendToFriday(event.date);
        return { ...event, shifted };
      });
      
      shiftedSamples.forEach(({ participantId, title, shifted }) => {
        const shiftNote = shifted.wasShifted ? ` (shifted from ${shifted.originalDate})` : '';
        message += `${participantId} - ${title}\n`;
        message += `   Date: ${shifted.adjustedDate}${shiftNote} at 9:00 AM\n\n`;
      });
      
      if (summary.totalEvents > 3) {
        message += `... and ${summary.totalEvents - 3} more events\n\n`;
      }
      
      message += `${demoModeChecked ? 'Demo mode: ON (events can be bulk-deleted)\n\n' : ''}`;
      message += `Note: This is a demo interface. Run with 'npm start' for full functionality.`;
      
      // Generate and display report
      const reportText = generateImportReport(demoResults);
      displayImportReport(reportText, demoResults);
      
      showAlert(message, 'success', true); // Persist in demo mode
      
      // Reset after showing message
      setTimeout(() => {
        importBtn.disabled = false;
        importBtn.textContent = 'Create Events';
      }, 3000);
      
      return;
    }
    
    const response = await fetch('/api/csv/import', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to import CSV');
    }
    
    const result = await response.json();
    
    if (result.success) {
      const { results } = result;
      
      // Generate report
      const reportText = generateImportReport(results);
      
      // Show success message with summary
      const shifted = results.details.filter(d => d.wasShifted).length;
      let message = `Import complete!\n\n` +
                   `• Created: ${results.created}\n`;
      
      if (results.reminderEvents !== undefined) {
        message += `  → Reminder: ${results.reminderEvents}\n`;
      }
      if (results.retentionEvents !== undefined) {
        message += `  → Retention: ${results.retentionEvents}\n`;
      }
      
      message += `• Skipped (already exist): ${results.skipped}\n` +
                 `• Errors: ${results.errors}`;
      
      if (shifted > 0) {
        message += `\n• Weekend shifts: ${shifted}`;
      }
      
      // Add attendee information
      const hasAttendees = results.details.some(d => d.hasAttendees);
      if (hasAttendees) {
        message += `\n• Attendees: Enabled (invitations sent)`;
      } else {
        message += `\n• Attendees: Disabled`;
      }
      
      // Display detailed report in UI
      displayImportReport(reportText, results);
      
      showAlert(message, 'success', true); // Persist
      
      // Reset after showing message
      setTimeout(() => {
        resetUpload();
      }, 3000);
    }
    
  } catch (error) {
    showAlert(`Error: ${error.message}`, 'error');
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = 'Create Events';
  }
}

function showAlert(message, type, persist = false) {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert alert-${type}`;
  
  // Create message div with pre-line formatting
  const messageDiv = document.createElement('div');
  messageDiv.style.whiteSpace = 'pre-line';
  messageDiv.textContent = message;
  
  // Create close button
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = 'position: absolute; top: 10px; right: 15px; font-size: 24px; cursor: pointer; opacity: 0.7;';
  closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
  closeBtn.onmouseout = () => closeBtn.style.opacity = '0.7';
  closeBtn.onclick = hideAlert;
  
  alertBox.innerHTML = '';
  alertBox.style.position = 'relative';
  alertBox.appendChild(closeBtn);
  alertBox.appendChild(messageDiv);
  alertBox.style.display = 'block';
  
  // Auto-hide after 8 seconds (unless persist is true)
  if (!persist) {
    setTimeout(hideAlert, 8000);
  }
}

function hideAlert() {
  const alertBox = document.getElementById('alertBox');
  alertBox.style.display = 'none';
}

// Generate import report text
function generateImportReport(results) {
  const timestamp = new Date().toLocaleString();
  let report = `CSV Import Report\n`;
  report += `Generated: ${timestamp}\n`;
  report += `${'='.repeat(60)}\n\n`;
  
  report += `SUMMARY:\n`;
  report += `Total Created: ${results.created}\n`;
  if (results.reminderEvents !== undefined) {
    report += `  • Reminder Events: ${results.reminderEvents}\n`;
  }
  if (results.retentionEvents !== undefined) {
    report += `  • Retention Events: ${results.retentionEvents}\n`;
  }
  report += `Total Skipped: ${results.skipped}\n`;
  report += `Total Errors: ${results.errors}\n`;
  report += `Weekend Shifts: ${results.details.filter(d => d.wasShifted).length}\n`;
  
  // Show attendee information if available
  const hasAttendees = results.details.some(d => d.hasAttendees);
  if (hasAttendees) {
    const firstWithAttendee = results.details.find(d => d.hasAttendees);
    if (firstWithAttendee) {
      report += `Invitations Sent To: Enabled (check server config for email)\n`;
    }
  } else {
    report += `Invitations: Disabled (no attendees added)\n`;
  }
  report += `\n`;
  
  if (results.created > 0) {
    report += `CREATED EVENTS:\n`;
    report += `${'-'.repeat(60)}\n`;
    results.details
      .filter(d => d.type === 'created')
      .forEach(event => {
        report += `Event: ${event.title}\n`;
        report += `Date: ${event.date}`;
        if (event.wasShifted) {
          report += ` (shifted from ${event.originalDate})`;
        }
        report += `\n`;
        
        // Add calendar type
        if (event.calendarType) {
          const calendarName = event.calendarType.charAt(0).toUpperCase() + event.calendarType.slice(1);
          report += `Calendar: ${calendarName} Calendar\n`;
        }
        
        // Add event type
        if (event.eventType) {
          const eventTypeName = event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);
          report += `Type: ${eventTypeName}\n`;
        }
        
        // Add attendee status
        if (event.hasAttendees !== undefined) {
          report += `Attendees: ${event.hasAttendees ? 'Yes' : 'No'}\n`;
        }
        
        report += `\n`;
      });
  }
  
  if (results.skipped > 0) {
    report += `\nSKIPPED EVENTS (Already Exist):\n`;
    report += `${'-'.repeat(60)}\n`;
    results.details
      .filter(d => d.type === 'skipped')
      .forEach(event => {
        report += `Event: ${event.participantId} - ${event.title}\n`;
        report += `Date: ${event.date}\n\n`;
      });
  }
  
  if (results.errors > 0) {
    report += `\nERRORS:\n`;
    report += `${'-'.repeat(60)}\n`;
    results.details
      .filter(d => d.type === 'error')
      .forEach(event => {
        report += `Event: ${event.participantId} - ${event.title}\n`;
        report += `Error: ${event.error}\n\n`;
      });
  }
  
  return report;
}

// Display report in UI with download button
function displayImportReport(reportText, results) {
  const previewDiv = document.getElementById('previewSection');
  if (!previewDiv) return;
  
  // Create report container
  const reportContainer = document.createElement('div');
  reportContainer.style.cssText = 'margin-top: 20px; padding: 20px; background: #f5f5f5; border-radius: 8px; border: 2px solid #4caf50;';
  
  const reportTitle = document.createElement('h3');
  reportTitle.textContent = 'Import Report';
  reportTitle.style.marginTop = '0';
  reportContainer.appendChild(reportTitle);
  
  // Add summary
  const summary = document.createElement('div');
  summary.style.cssText = 'margin: 15px 0; padding: 15px; background: white; border-radius: 4px;';
  const shifted = results.details.filter(d => d.wasShifted).length;
  
  // Check for attendee information
  const hasAttendees = results.details.some(d => d.hasAttendees);
  const attendeeNote = hasAttendees 
    ? '• Attendees: <strong>Enabled</strong> (invitations sent)<br>' 
    : '• Attendees: <strong>Disabled</strong> (no invitations sent)<br>';
  
  let summaryHTML = `
    <strong>Summary:</strong><br>
    • Created: ${results.created}<br>`;
  
  if (results.reminderEvents !== undefined) {
    summaryHTML += `  &nbsp;&nbsp;→ Reminder Events: ${results.reminderEvents}<br>`;
  }
  if (results.retentionEvents !== undefined) {
    summaryHTML += `  &nbsp;&nbsp;→ Retention Events: ${results.retentionEvents}<br>`;
  }
  
  summaryHTML += `
    • Skipped: ${results.skipped}<br>
    • Errors: ${results.errors}<br>
    ${shifted > 0 ? `• Weekend Shifts: ${shifted}<br>` : ''}
    ${attendeeNote}
  `;
  
  summary.innerHTML = summaryHTML;
  reportContainer.appendChild(summary);
  
  // Add event list
  if (results.created > 0) {
    const eventList = document.createElement('div');
    eventList.style.cssText = 'margin: 15px 0; padding: 15px; background: white; border-radius: 4px; max-height: 300px; overflow-y: auto;';
    
    let eventHTML = '<strong>Created Events:</strong><br><br>';
    results.details
      .filter(d => d.type === 'created')
      .forEach(event => {
        const shiftNote = event.wasShifted ? ` <span style="color: #ff9800;">(shifted from ${event.originalDate})</span>` : '';
        
        eventHTML += `• ${event.title}<br>`;
        eventHTML += `  Date: ${event.date}${shiftNote}<br>`;
        
        // Add calendar type
        if (event.calendarType) {
          const calendarName = event.calendarType.charAt(0).toUpperCase() + event.calendarType.slice(1);
          eventHTML += `  Calendar: <strong>${calendarName}</strong><br>`;
        }
        
        // Add event type
        if (event.eventType) {
          const eventTypeName = event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1);
          const typeColor = event.eventType === 'retention' ? '#2196f3' : '#4caf50';
          eventHTML += `  Type: <span style="color: ${typeColor}; font-weight: bold;">${eventTypeName}</span><br>`;
        }
        
        // Add attendee information
        if (event.hasAttendees !== undefined) {
          const attendeeText = event.hasAttendees ? '✅ Yes' : '❌ No';
          eventHTML += `  Attendees: ${attendeeText}<br>`;
        }
        
        eventHTML += `<br>`;
      });
    
    eventList.innerHTML = eventHTML;
    reportContainer.appendChild(eventList);
  }
  
  // Add download button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download Report (TXT)';
  downloadBtn.className = 'btn btn-secondary';
  downloadBtn.style.marginTop = '15px';
  downloadBtn.onclick = () => downloadReport(reportText);
  reportContainer.appendChild(downloadBtn);
  
  // Insert after preview section
  previewDiv.appendChild(reportContainer);
}

// Download report as text file
function downloadReport(reportText) {
  const blob = new Blob([reportText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `import-report-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

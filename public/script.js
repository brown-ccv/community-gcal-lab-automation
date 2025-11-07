// Form handling and API calls

// Global demo mode flag - will be set on page load
let IS_DEMO_MODE = true;

// Helper function to check if a date falls on weekend
function isWeekend(dateStr) {
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
    console.error('Failed to check demo mode, defaulting to demo:', error);
    IS_DEMO_MODE = true;
  }
})();

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
  
  // Auto-hide after 8 seconds for success messages (unless persist is true)
  if (type === 'success' && !persist) {
    setTimeout(() => {
      alertDiv.style.display = 'none';
    }, 8000);
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
          const shifted = shiftWeekendToFriday(ed.date);
          return {
            type: 'created',
            title: `${participantId} - ${title} - ${ed.label} check-in`,
            date: shifted.adjustedDate,
            wasShifted: shifted.wasShifted,
            originalDate: shifted.originalDate,
            participantId
          };
        })
      };
      
      let message = `[DEMO] Would have created 3 events for "${title}":\n\n`;
      
      reportData.details.forEach(detail => {
        const shiftInfo = detail.wasShifted ? ` (shifted from ${detail.originalDate})` : '';
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
      
      let message = '';
      if (created > 0) {
        message = `Successfully created ${created} event(s)!`;
        if (created === 3) {
          message += ' Check your calendar and email for the invites:\n\n';
          data.results.filter(r => r.type === 'created').forEach(r => {
            const shiftNote = r.wasShifted ? ` (shifted from ${r.originalDate})` : '';
            message += `• ${r.title}\n  Date: ${r.date}${shiftNote}\n`;
          });
        }
        
        if (shifted > 0) {
          message += `\nNote: ${shifted} event(s) were shifted from weekends to Friday.`;
        }
        
        message += '\n\nCheck your calendar and email.';
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

// Handle delete events form
document.getElementById('delete-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const deleteBtn = document.getElementById('delete-btn');
  const originalText = deleteBtn.textContent;
  
  // Get form values
  const baseDate = document.getElementById('deleteBaseDate').value.trim();
  const title = document.getElementById('deleteTitle').value.trim();
  const attendeeEmail = document.getElementById('deleteAttendeeEmail').value.trim();
  
  // Validation
  if (!validateDate(baseDate)) {
    showAlert('Invalid date format. Please use MM/DD/YYYY', 'error');
    return;
  }
  
  if (!attendeeEmail) {
    showAlert('Attendee email is required.', 'error');
    return;
  }
  
  // Confirm deletion
  if (!confirm(`Are you sure you want to delete all check-in events for "${title}" (${attendeeEmail}) with base date ${baseDate}?`)) {
    return;
  }
  
  // Disable button and show loading
  deleteBtn.disabled = true;
  deleteBtn.innerHTML = '<span class="loading-spinner"></span>Deleting events...';
  
  try {
    if (IS_DEMO_MODE) {
      // DEMO MODE: Simulate deleting events without actual API calls
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay
      
      const message = `[DEMO] Would have deleted 3 events for "${title}" (${attendeeEmail})\n\n` +
                     `Note: This is a demo interface. Run with 'npm start' for full functionality.`;
      
      showAlert(message, 'success', true); // Persist in demo mode
    } else {
      // REAL MODE: Make actual API call
      const response = await fetch('/delete-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseDate, title, attendeeEmail }),
        redirect: 'manual',
      });
      
      // Handle redirect to authorization
      if (response.type === 'opaqueredirect' || response.status === 302) {
        window.location.href = '/authorize';
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete events');
      }
      
      // Count results
      const deleted = data.results.filter(r => r.type === 'deleted').length;
      const notFound = data.results.filter(r => r.type === 'not-found').length;
      const errors = data.results.filter(r => r.type === 'error').length;
      
      let message = '';
      if (deleted > 0) {
        message = `Successfully deleted ${deleted} event(s).`;
      } else {
        message = `No matching events found to delete.`;
      }
      
      if (errors > 0) {
        message += ` Warning: ${errors} event(s) failed to delete.`;
      }
      
      showAlert(message, errors > 0 ? 'error' : 'success', true); // Persist
    }
    
    // Clear form on success
    document.getElementById('delete-form').reset();
    
  } catch (error) {
    console.error('Error:', error);
    showAlert(`❌ Error: ${error.message}`, 'error');
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.textContent = originalText;
  }
});

// Handle clear all demo events button
document.getElementById('clear-demo-btn')?.addEventListener('click', async () => {
  const clearBtn = document.getElementById('clear-demo-btn');
  const originalText = clearBtn.textContent;
  
  // Confirm action
  if (!confirm('⚠️ Are you sure you want to delete ALL demo mode events?\n\nThis will permanently remove all events that were created with "Demo Mode" enabled.\n\nThis action cannot be undone.')) {
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

// Delete recent events handler
document.getElementById('delete-recent-btn').addEventListener('click', async function() {
  const hours = parseInt(document.getElementById('deleteHours').value) || 24;
  
  if (!confirm(`WARNING: This will DELETE ALL events created by this tool in the last ${hours} hours.\n\nThis includes both manual entries and CSV imports, regardless of demo mode.\n\nAre you sure you want to continue?`)) {
    return;
  }

  const deleteBtn = this;
  const originalText = deleteBtn.textContent;
  deleteBtn.disabled = true;
  deleteBtn.textContent = 'Deleting...';

  try {
    if (IS_DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showAlert(`[DEMO] Would have deleted recent automation events from the last ${hours} hours`, 'success', true); // Persist in demo mode
      return;
    }

    const response = await fetch('/api/delete-recent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours }),
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
      if (results.deleted > 0) {
        message = `Successfully deleted ${results.deleted} event(s) from the last ${hours} hours.\n\n`;
        if (results.eventsFound.length > 0) {
          message += 'Deleted events:\n';
          results.eventsFound.slice(0, 5).forEach(e => {
            message += `• ${e.summary}\n`;
          });
          if (results.eventsFound.length > 5) {
            message += `... and ${results.eventsFound.length - 5} more`;
          }
        }
      } else {
        message = `No automation events found in the last ${hours} hours.`;
      }
      
      if (results.errors > 0) {
        message += `\n\nWarning: ${results.errors} event(s) failed to delete.`;
        console.error('Error details:', results.errorDetails);
      }
      
      showAlert(message, errors > 0 ? 'error' : 'success', true); // Persist
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

// Generate report for manual entry
function generateManualEntryReport(reportData, projectTitle) {
  const timestamp = new Date().toLocaleString();
  let report = `Manual Entry Report\n`;
  report += `Project: ${projectTitle}\n`;
  report += `Generated: ${timestamp}\n`;
  report += `${'='.repeat(60)}\n\n`;
  
  report += `SUMMARY:\n`;
  report += `Total Events: ${reportData.created}\n`;
  report += `Weekend Shifts: ${reportData.details.filter(d => d.wasShifted).length}\n\n`;
  
  report += `EVENTS TO BE CREATED:\n`;
  report += `${'-'.repeat(60)}\n`;
  reportData.details.forEach(event => {
    report += `Event: ${event.title}\n`;
    report += `Date: ${event.date}`;
    if (event.wasShifted) {
      report += ` (shifted from weekend to Friday)`;
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
  const shifted = reportData.details.filter(d => d.wasShifted).length;
  summary.innerHTML = `
    <strong>Summary:</strong><br>
    • Total Events: ${reportData.created}<br>
    ${shifted > 0 ? `• Weekend Shifts: ${shifted}<br>` : ''}
  `;
  reportContainer.appendChild(summary);
  
  // Add event list
  const eventList = document.createElement('div');
  eventList.style.cssText = 'margin: 15px 0; padding: 15px; background: white; border-radius: 4px;';
  
  let eventHTML = '<strong>Events:</strong><br><br>';
  reportData.details.forEach(event => {
    const shiftNote = event.wasShifted ? ` <span style="color: #ff9800;">(shifted from weekend)</span>` : '';
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

// Form handling and API calls

// Global demo mode flag - will be set on page load
let IS_DEMO_MODE = true;

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
          <strong>ℹ️ Demo Version</strong>
          <p style="margin: 0.5rem 0 0 0;">
            This is a demonstration interface showcasing the calendar automation tool's capabilities. 
            <strong>No actual calendar events will be created from this hosted version.</strong> 
            For full functionality, run <code>npm start</code> locally with proper Google Calendar API credentials.
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
function showAlert(message, type = 'success') {
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
  
  // Auto-hide after 8 seconds for success messages
  if (type === 'success') {
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
  const time = document.getElementById('time').value.trim();
  const attendeeEmail = document.getElementById('attendeeEmail').value.trim();
  const demoMode = document.getElementById('demoMode').checked;
  
  // Validation
  if (!validateDate(baseDate)) {
    showAlert('Invalid date format. Please use MM/DD/YYYY (e.g., 11/10/2025)', 'error');
    return;
  }
  
  if (!validateTime(time)) {
    showAlert('Invalid time format. Please use HH:MM in 24-hour format (e.g., 09:00, 14:30)', 'error');
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
      
      const message = `✅ [DEMO] Would have created 3 events for "${title}" (${attendeeEmail}):\n\n` +
                     `• ${title} - 1 day check-in on ${eventDates[0].date}\n` +
                     `• ${title} - 10 day check-in on ${eventDates[1].date}\n` +
                     `• ${title} - 45 day check-in on ${eventDates[2].date}\n\n` +
                     `ℹ️ This is a demo interface. Run with 'npm start' for full functionality.`;
      
      showAlert(message, 'success');
    } else {
      // REAL MODE: Make actual API call
      const response = await fetch('/create-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ baseDate, title, time: time || '09:00', attendeeEmail, demoMode }),
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
      
      let message = '';
      if (created > 0) {
        message = `✅ Successfully created ${created} event(s)!`;
        if (skipped > 0) {
          message += ` (${skipped} already existed)`;
        }
        if (data.demoMode) {
          message += ' [Demo Mode - Events tagged for easy cleanup]';
        }
        message += ' Check your calendar and email.';
      } else if (skipped > 0) {
        message = `ℹ️ All ${skipped} event(s) already exist. No duplicates created.`;
      }
      
      if (errors > 0) {
        message += ` ⚠️ ${errors} event(s) failed to create.`;
      }
      
      showAlert(message, errors > 0 ? 'error' : 'success');
    }
    
    // Clear form on success
    document.getElementById('create-form').reset();
    document.getElementById('preview-1day').textContent = 'Your Title - 1 day check-in';
    document.getElementById('preview-10day').textContent = 'Your Title - 10 day check-in';
    document.getElementById('preview-45day').textContent = 'Your Title - 45 day check-in';
    document.getElementById('preview-email').textContent = 'participant@example.com';
    
  } catch (error) {
    console.error('Error:', error);
    showAlert(`❌ Error: ${error.message}`, 'error');
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
      // DEMO MODE: Simulate event deletion without actual API calls
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      const message = `✅ [DEMO] Would have deleted 3 events for "${title}" (${attendeeEmail})\n\n` +
                     `ℹ️ This is a demo interface. Run with 'npm start' for full functionality.`;
      
      showAlert(message, 'success');
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
        message = `✅ Successfully deleted ${deleted} event(s).`;
      } else if (notFound > 0) {
        message = `ℹ️ No matching events found to delete.`;
      }
      
      if (errors > 0) {
        message += ` ⚠️ ${errors} event(s) failed to delete.`;
      }
      
      showAlert(message, errors > 0 ? 'error' : 'success');
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
      
      const message = `✅ [DEMO] Would have cleared all demo mode events from calendar\n\n` +
                     `ℹ️ This is a demo interface. Run with 'npm start' for full functionality.`;
      
      showAlert(message, 'success');
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
        message = `✅ Successfully deleted ${data.deleted} demo event(s).`;
      } else {
        message = `ℹ️ No demo events found to delete.`;
      }
      
      if (data.errors > 0) {
        message += ` ⚠️ ${data.errors} event(s) failed to delete.`;
        console.error('Error details:', data.errorDetails);
      }
      
      showAlert(message, data.errors > 0 ? 'error' : 'success');
    }
    
  } catch (error) {
    console.error('Error:', error);
    showAlert(`❌ Error: ${error.message}`, 'error');
  } finally {
    clearBtn.disabled = false;
    clearBtn.textContent = originalText;
  }
});

// Show success message if redirected after authorization
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('authorized') === 'true') {
  showAlert('✅ Successfully authorized! You can now create calendar events.', 'success');
  // Clean up URL
  window.history.replaceState({}, document.title, window.location.pathname);
}

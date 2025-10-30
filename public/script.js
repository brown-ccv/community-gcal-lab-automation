// Form handling and API calls

// Show alert message
function showAlert(message, type = 'success') {
  const alertDiv = document.getElementById('alert');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;
  alertDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      alertDiv.style.display = 'none';
    }, 5000);
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
    // DEMO MODE: Simulate event creation without actual API calls
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    const message = `✅ [DEMO] Would have created 3 events for "${title}" (${attendeeEmail}):\n` +
                   `• ${title} - 1 day check-in\n` +
                   `• ${title} - 10 day check-in\n` +
                   `• ${title} - 45 day check-in\n\n` +
                   `ℹ️ This is a demo interface. Run locally with credentials.json for full functionality.`;
    
    showAlert(message, 'success');
    
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
    // DEMO MODE: Simulate event deletion without actual API calls
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    
    const message = `✅ [DEMO] Would have deleted 3 events for "${title}" (${attendeeEmail})\n\n` +
                   `ℹ️ This is a demo interface. Run locally with credentials.json for full functionality.`;
    
    showAlert(message, 'success');
    
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
    // DEMO MODE: Simulate clearing events without actual API calls
    await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API delay
    
    const message = `✅ [DEMO] Would have cleared all demo mode events from calendar\n\n` +
                   `ℹ️ This is a demo interface. Run locally with credentials.json for full functionality.`;
    
    showAlert(message, 'success');
    
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

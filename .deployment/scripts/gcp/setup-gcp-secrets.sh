#!/bin/bash
# Setup Google Cloud Secret Manager secrets for Cloud Run
# This script creates and configures all required application secrets
# Run this ONCE before deploying to Cloud Run

set -e

echo "================================================================"
echo "  Google Cloud Secret Manager Setup"
echo "================================================================"
echo ""

# Get project ID
echo "Detecting GCP project..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo "ERROR: No GCP project configured"
  echo "Please run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo "Project ID: ${PROJECT_ID}"
echo ""

# Enable Secret Manager API
echo "Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --project="${PROJECT_ID}"
echo "Secret Manager API enabled"
echo ""

# Function to create or update secret
create_secret() {
  local SECRET_NAME=$1
  local SECRET_DESCRIPTION=$2
  local PROMPT_MESSAGE=$3
  
  echo ""
  echo "================================================================"
  echo "Secret: ${SECRET_NAME}"
  echo "Description: ${SECRET_DESCRIPTION}"
  echo "================================================================"
  
  # Check if secret already exists
  if gcloud secrets describe "${SECRET_NAME}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "Secret already exists"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Skipping ${SECRET_NAME}"
      return
    fi
  else
    # Create the secret
    echo "Creating secret..."
    gcloud secrets create "${SECRET_NAME}" \
      --replication-policy="automatic" \
      --project="${PROJECT_ID}"
    echo "Secret created"
  fi
  
  # Prompt for secret value
  echo ""
  echo "${PROMPT_MESSAGE}"
  read -sp "Enter value (input hidden): " SECRET_VALUE
  echo ""
  
  if [ -z "$SECRET_VALUE" ]; then
    echo "ERROR: Empty value, skipping"
    return
  fi
  
  # Add secret version
  echo "Adding secret version..."
  echo -n "$SECRET_VALUE" | gcloud secrets versions add "${SECRET_NAME}" \
    --data-file=- \
    --project="${PROJECT_ID}"
  
  echo "Secret value set"
}

# Main setup
echo "This script will guide you through setting up all required secrets."
echo "You will need values from:"
echo "  - Google Cloud Console (OAuth credentials)"
echo "  - Google Calendar (Calendar IDs)"
echo "  - Random generated values (session secret)"
echo ""
read -p "Press Enter to continue..."

# 1. AUTH_CLIENT_ID
create_secret \
  "auth-client-id" \
  "Google OAuth 2.0 Client ID for web application" \
  "Get this from Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID"

# 2. AUTH_CLIENT_SECRET
create_secret \
  "auth-client-secret" \
  "Google OAuth 2.0 Client Secret" \
  "Get this from Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID"

# 3. SESSION_SECRET
echo ""
echo "================================================================"
echo "Secret: session-secret"
echo "Description: Random secret for Express session encryption"
echo "================================================================"

if gcloud secrets describe "session-secret" --project="${PROJECT_ID}" &>/dev/null; then
  echo "Secret already exists"
  read -p "Do you want to regenerate it? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo "Adding new secret version..."
    echo -n "$SESSION_SECRET" | gcloud secrets versions add "session-secret" \
      --data-file=- \
      --project="${PROJECT_ID}"
    echo "New session secret generated"
  fi
else
  echo "Generating random session secret..."
  gcloud secrets create "session-secret" \
    --replication-policy="automatic" \
    --project="${PROJECT_ID}"
  
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  echo -n "$SESSION_SECRET" | gcloud secrets versions add "session-secret" \
    --data-file=- \
    --project="${PROJECT_ID}"
  echo "Session secret created"
fi

# 4. REMINDER_CALENDAR_ID
create_secret \
  "reminder-calendar-id" \
  "Google Calendar ID for BURST checklist reminders" \
  "Get this from Google Calendar → Settings → Integrate calendar (format: xxx@group.calendar.google.com)"

# 5. RETENTION_CALENDAR_ID
create_secret \
  "retention-calendar-id" \
  "Google Calendar ID for 45-day retention events" \
  "Get this from Google Calendar → Settings → Integrate calendar (format: xxx@group.calendar.google.com)"

# 6. PRODUCTION_ATTENDEE_EMAIL (optional)
echo ""
echo "================================================================"
echo "Secret: production-attendee-email (OPTIONAL)"
echo "Description: Email to receive calendar invitations"
echo "================================================================"
read -p "Do you want to set PRODUCTION_ATTENDEE_EMAIL? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  create_secret \
    "production-attendee-email" \
    "Email address to receive calendar event invitations" \
    "Enter the email address that should receive calendar invitations"
fi

# Grant service account access to secrets
echo ""
echo "================================================================"
echo "Granting service account access to secrets"
echo "================================================================"

SERVICE_NAME="gcal-lab-automation"
SA_EMAIL="${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Service Account: ${SA_EMAIL}"
echo ""

# Check if service account exists
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "ERROR: Service account not found: ${SA_EMAIL}"
  echo "Please run .deployment/scripts/gcp/setup-service-account.sh first"
  exit 1
fi

# Grant access to all secrets
SECRETS=("auth-client-id" "auth-client-secret" "session-secret" "reminder-calendar-id" "retention-calendar-id")

for SECRET in "${SECRETS[@]}"; do
  if gcloud secrets describe "${SECRET}" --project="${PROJECT_ID}" &>/dev/null; then
    echo "  Granting access to ${SECRET}..."
    gcloud secrets add-iam-policy-binding "${SECRET}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" \
      --project="${PROJECT_ID}" \
      --quiet
  fi
done

# Check if production-attendee-email exists and grant access
if gcloud secrets describe "production-attendee-email" --project="${PROJECT_ID}" &>/dev/null; then
  echo "  Granting access to production-attendee-email..."
  gcloud secrets add-iam-policy-binding "production-attendee-email" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="${PROJECT_ID}" \
    --quiet
fi

echo "All permissions granted"

# Summary
echo ""
echo "================================================================"
echo "  Setup Complete!"
echo "================================================================"
echo ""
echo "Secrets configured in project: ${PROJECT_ID}"
echo ""
echo "For next steps, see .deployment/DEPLOYMENT.md (Phase 1, Step 1.3)"
echo ""

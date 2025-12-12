#!/bin/bash
# Setup Google Cloud Service Account for Cloud Run deployment
# This script creates a service account with the necessary IAM roles
# Run this ONCE before deploying to Cloud Run

set -e

echo "================================================================"
echo "  Google Cloud Service Account Setup"
echo "================================================================"
echo ""

# Configuration
SERVICE_NAME="gcal-lab-automation"
SA_NAME="${SERVICE_NAME}-sa"

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

# Service account email
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if service account already exists
echo "Checking if service account exists..."
if gcloud iam service-accounts describe "${SA_EMAIL}" &>/dev/null; then
  echo "Service account already exists: ${SA_EMAIL}"
  read -p "Do you want to update its roles? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping service account creation"
    exit 0
  fi
else
  # Create service account
  echo "Creating service account..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Cloud Run service account for ${SERVICE_NAME}" \
    --description="Automated service account for Cloud Run deployment" \
    --project="${PROJECT_ID}"
  
  echo "Service account created: ${SA_EMAIL}"
fi

echo ""
echo "Assigning IAM roles..."

# Required roles for Cloud Run service account
ROLES=(
  "roles/run.invoker"
  "roles/cloudsql.client"
  "roles/secretmanager.secretAccessor"
  "roles/logging.logWriter"
  "roles/cloudtrace.agent"
  "roles/monitoring.metricWriter"
)

for ROLE in "${ROLES[@]}"; do
  echo "  Assigning ${ROLE}..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet
done

echo "All roles assigned"
echo ""

# Create service account key for GitHub Actions
echo "Creating service account key for GitHub Actions..."
KEY_FILE="/tmp/${SA_NAME}-key.json"

if [ -f "${KEY_FILE}" ]; then
  echo "Key file already exists, removing old key"
  rm "${KEY_FILE}"
fi

gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_EMAIL}" \
  --project="${PROJECT_ID}"

echo "Service account key created: ${KEY_FILE}"
echo ""

# Additional roles for GitHub Actions service account to deploy
echo "Assigning deployment roles to service account..."

DEPLOY_ROLES=(
  "roles/run.admin"
  "roles/iam.serviceAccountUser"
  "roles/artifactregistry.writer"
  "roles/cloudbuild.builds.builder"
  "roles/serviceusage.serviceUsageAdmin"
)

for ROLE in "${DEPLOY_ROLES[@]}"; do
  echo "  Assigning ${ROLE}..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet
done

echo "Deployment roles assigned"
echo ""

# Enable required APIs
echo "Enabling required GCP APIs..."

APIS=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "secretmanager.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "iam.googleapis.com"
)

for API in "${APIS[@]}"; do
  echo "  Enabling ${API}..."
  gcloud services enable "${API}" --project="${PROJECT_ID}"
done

echo "All APIs enabled"
echo ""

# Summary
echo "================================================================"
echo "  Setup Complete!"
echo "================================================================"
echo ""
echo "Service Account: ${SA_EMAIL}"
echo "Project: ${PROJECT_ID}"
echo "Key File: ${KEY_FILE}"
echo ""
echo "For next steps, see .deployment/DEPLOYMENT.md (Phase 1, Step 1.3)"
echo ""

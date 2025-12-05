#!/bin/bash
# Setup Google Cloud Service Account for Cloud Run deployment
# This script creates a service account with the necessary IAM roles
# Run this ONCE before deploying to Cloud Run

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================================"
echo "  🔐 Google Cloud Service Account Setup"
echo "================================================================"
echo ""

# Configuration
SERVICE_NAME="gcal-lab-automation"
SA_NAME="${SERVICE_NAME}-sa"

# Get project ID
echo "🔍 Detecting GCP project..."
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)

if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ No GCP project configured${NC}"
  echo "Please run: gcloud config set project YOUR_PROJECT_ID"
  exit 1
fi

echo -e "${GREEN}✅ Project ID: ${PROJECT_ID}${NC}"
echo ""

# Service account email
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Check if service account already exists
echo "🔍 Checking if service account exists..."
if gcloud iam service-accounts describe "${SA_EMAIL}" &>/dev/null; then
  echo -e "${YELLOW}⚠️  Service account already exists: ${SA_EMAIL}${NC}"
  read -p "Do you want to update its roles? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping service account creation"
    exit 0
  fi
else
  # Create service account
  echo "🔄 Creating service account..."
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Cloud Run service account for ${SERVICE_NAME}" \
    --description="Automated service account for Cloud Run deployment" \
    --project="${PROJECT_ID}"
  
  echo -e "${GREEN}✅ Service account created: ${SA_EMAIL}${NC}"
fi

echo ""
echo "🔐 Assigning IAM roles..."

# Required roles for Cloud Run service account
ROLES=(
  "roles/run.invoker"                  # Invoke Cloud Run services
  "roles/cloudsql.client"             # Access Cloud SQL (if needed)
  "roles/secretmanager.secretAccessor" # Access secrets
  "roles/logging.logWriter"           # Write logs
  "roles/cloudtrace.agent"            # Send traces
  "roles/monitoring.metricWriter"     # Write metrics
)

for ROLE in "${ROLES[@]}"; do
  echo "  → Assigning ${ROLE}..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet
done

echo -e "${GREEN}✅ All roles assigned${NC}"
echo ""

# Create service account key for GitHub Actions
echo "🔑 Creating service account key for GitHub Actions..."
KEY_FILE="/tmp/${SA_NAME}-key.json"

if [ -f "${KEY_FILE}" ]; then
  echo -e "${YELLOW}⚠️  Key file already exists, removing old key${NC}"
  rm "${KEY_FILE}"
fi

gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_EMAIL}" \
  --project="${PROJECT_ID}"

echo -e "${GREEN}✅ Service account key created: ${KEY_FILE}${NC}"
echo ""

# Additional roles for GitHub Actions service account to deploy
echo "🔐 Assigning deployment roles to service account..."

DEPLOY_ROLES=(
  "roles/run.admin"                   # Manage Cloud Run services
  "roles/iam.serviceAccountUser"      # Act as service account
  "roles/artifactregistry.writer"     # Push to Artifact Registry
  "roles/cloudbuild.builds.builder"   # Build images
)

for ROLE in "${DEPLOY_ROLES[@]}"; do
  echo "  → Assigning ${ROLE}..."
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet
done

echo -e "${GREEN}✅ Deployment roles assigned${NC}"
echo ""

# Enable required APIs
echo "🔍 Enabling required GCP APIs..."

APIS=(
  "run.googleapis.com"
  "cloudbuild.googleapis.com"
  "artifactregistry.googleapis.com"
  "secretmanager.googleapis.com"
  "cloudresourcemanager.googleapis.com"
  "iam.googleapis.com"
)

for API in "${APIS[@]}"; do
  echo "  → Enabling ${API}..."
  gcloud services enable "${API}" --project="${PROJECT_ID}"
done

echo -e "${GREEN}✅ All APIs enabled${NC}"
echo ""

# Display key content for GitHub Actions
echo "================================================================"
echo "  ✅ Setup Complete!"
echo "================================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Add the service account key to GitHub Secrets:"
echo "   GitHub Repo → Settings → Secrets → New repository secret"
echo "   Name: GCP_SERVICE_ACCOUNT_KEY"
echo "   Value: (paste the entire content of the key file)"
echo ""
echo "2. Copy the key content:"
echo "   ${YELLOW}cat ${KEY_FILE}${NC}"
echo ""
echo "3. Or use the GitHub CLI:"
echo "   ${YELLOW}gh secret set GCP_SERVICE_ACCOUNT_KEY < ${KEY_FILE}${NC}"
echo ""
echo "4. After adding to GitHub, DELETE the local key file:"
echo "   ${YELLOW}rm ${KEY_FILE}${NC}"
echo ""
echo "5. Setup GCP secrets (if not already done):"
echo "   ${YELLOW}./.deployment/scripts/gcp/setup-gcp-secrets.sh${NC}"
echo ""
echo "Service Account: ${SA_EMAIL}"
echo "Project: ${PROJECT_ID}"
echo ""

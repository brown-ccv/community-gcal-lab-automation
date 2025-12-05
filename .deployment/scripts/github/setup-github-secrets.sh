#!/bin/bash
# Setup GitHub Secrets for Cloud Run deployment
# This script uses GitHub CLI to configure repository secrets
# Run this ONCE before using GitHub Actions to deploy

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================================"
echo "  🔐 GitHub Secrets Setup"
echo "================================================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
  echo ""
  echo "Install it from: https://cli.github.com/"
  echo ""
  echo "Or using package managers:"
  echo "  macOS:   brew install gh"
  echo "  Ubuntu:  sudo apt install gh"
  echo "  Windows: winget install GitHub.cli"
  exit 1
fi

echo -e "${GREEN}✅ GitHub CLI found${NC}"
echo ""

# Check if authenticated
echo "🔍 Checking GitHub authentication..."
if ! gh auth status &>/dev/null; then
  echo -e "${RED}❌ Not authenticated with GitHub${NC}"
  echo ""
  echo "Please run: ${YELLOW}gh auth login${NC}"
  echo ""
  echo "Required scopes: repo, workflow, admin:repo_hook"
  exit 1
fi

echo -e "${GREEN}✅ Authenticated with GitHub${NC}"
echo ""

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

if [ -z "$REPO" ]; then
  echo -e "${RED}❌ Not in a GitHub repository${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Repository: ${REPO}${NC}"
echo ""

# Instructions
echo "================================================================"
echo "This script will set up GitHub Secrets for deployment."
echo ""
echo "You will need:"
echo "  1. GCP Service Account Key JSON file"
echo "     (created by: .deployment/scripts/gcp/setup-service-account.sh)"
echo ""
echo "================================================================"
echo ""
read -p "Press Enter to continue..."

# 1. GCP_SERVICE_ACCOUNT_KEY
echo ""
echo "================================================================"
echo -e "${BLUE}Secret: GCP_SERVICE_ACCOUNT_KEY${NC}"
echo "Description: Service account key for GCP authentication"
echo "================================================================"
echo ""

# Check if secret already exists
if gh secret list | grep -q "GCP_SERVICE_ACCOUNT_KEY"; then
  echo -e "${YELLOW}⚠️  Secret GCP_SERVICE_ACCOUNT_KEY already exists${NC}"
  read -p "Do you want to update it? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Skipping GCP_SERVICE_ACCOUNT_KEY"
  else
    echo ""
    echo "Enter the path to your service account key JSON file:"
    echo "(e.g., /tmp/gcal-lab-automation-sa-key.json)"
    read -r KEY_FILE_PATH
    
    if [ ! -f "$KEY_FILE_PATH" ]; then
      echo -e "${RED}❌ File not found: ${KEY_FILE_PATH}${NC}"
    else
      echo "🔄 Setting secret..."
      gh secret set GCP_SERVICE_ACCOUNT_KEY < "$KEY_FILE_PATH"
      echo -e "${GREEN}✅ Secret updated${NC}"
    fi
  fi
else
  echo "Enter the path to your service account key JSON file:"
  echo "(e.g., /tmp/gcal-lab-automation-sa-key.json)"
  read -r KEY_FILE_PATH
  
  if [ ! -f "$KEY_FILE_PATH" ]; then
    echo -e "${RED}❌ File not found: ${KEY_FILE_PATH}${NC}"
    echo "Please run .deployment/scripts/gcp/setup-service-account.sh first"
    exit 1
  fi
  
  echo "🔄 Setting secret..."
  gh secret set GCP_SERVICE_ACCOUNT_KEY < "$KEY_FILE_PATH"
  echo -e "${GREEN}✅ Secret created${NC}"
  
  echo ""
  echo -e "${YELLOW}⚠️  IMPORTANT: Delete the local key file after confirming deployment works${NC}"
  echo "   rm ${KEY_FILE_PATH}"
fi

# Summary
echo ""
echo "================================================================"
echo "  ✅ Setup Complete!"
echo "================================================================"
echo ""
echo "GitHub Secrets configured for repository: ${REPO}"
echo ""
echo "List all secrets:"
echo "  ${YELLOW}gh secret list${NC}"
echo ""
echo "Next steps:"
echo "1. Verify secrets are set: ./.deployment/scripts/github/validate-github-config.sh"
echo "2. Setup GitHub environments (optional): ./.deployment/scripts/github/setup-github-environments.sh"
echo "3. Trigger deployment via GitHub Actions"
echo "   → Go to: https://github.com/${REPO}/actions"
echo "   → Select: 'Deploy to Google Cloud Run'"
echo "   → Click: 'Run workflow'"
echo ""

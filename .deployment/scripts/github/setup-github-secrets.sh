#!/bin/bash
# Setup GitHub Secrets for Cloud Run deployment
# This script uses GitHub CLI to configure repository secrets
# Run this ONCE before using GitHub Actions to deploy

set -e

echo "================================================================"
echo "  GitHub Secrets Setup"
echo "================================================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "ERROR: GitHub CLI (gh) is not installed"
  echo ""
  echo "Install it from: https://cli.github.com/"
  echo ""
  echo "Or using package managers:"
  echo "  macOS:   brew install gh"
  echo "  Ubuntu:  sudo apt install gh"
  echo "  Windows: winget install GitHub.cli"
  exit 1
fi

echo "GitHub CLI found"
echo ""

# Check if authenticated
echo "Checking GitHub authentication..."
if ! gh auth status &>/dev/null; then
  echo "ERROR: Not authenticated with GitHub"
  echo ""
  echo "Please run: gh auth login"
  echo ""
  echo "Required scopes: repo, workflow, admin:repo_hook"
  exit 1
fi

echo "Authenticated with GitHub"
echo ""

# Get repository info
echo "Detecting repository..."
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)

if [ -z "$REPO" ]; then
  echo "ERROR: Not in a GitHub repository"
  exit 1
fi

echo "Current repository: ${REPO}"
echo ""

# Allow user to choose a different repository if needed
read -p "Is this the correct repository? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Available repositories:"
  gh repo list --json nameWithOwner -q '.[].nameWithOwner' | nl
  echo ""
  echo "Enter the full repository name (e.g., owner/repo-name):"
  read -r REPO_INPUT
  
  if [ -n "$REPO_INPUT" ]; then
    REPO="$REPO_INPUT"
    echo "Using repository: ${REPO}"
  else
    echo "ERROR: No repository specified"
    exit 1
  fi
fi

echo ""
echo "Configuring secrets for: ${REPO}"
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
echo "Secret: GCP_SERVICE_ACCOUNT_KEY"
echo "Description: Service account key for GCP authentication"
echo "================================================================"
echo ""

# Check if secret already exists
if gh secret list -R "$REPO" | grep -q "GCP_SERVICE_ACCOUNT_KEY"; then
  echo "Secret GCP_SERVICE_ACCOUNT_KEY already exists"
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
      echo "ERROR: File not found: ${KEY_FILE_PATH}"
    else
      echo "Setting secret..."
      gh secret set GCP_SERVICE_ACCOUNT_KEY -R "$REPO" < "$KEY_FILE_PATH"
      echo "Secret updated"
    fi
  fi
else
  echo "Enter the path to your service account key JSON file:"
  echo "(e.g., /tmp/gcal-lab-automation-sa-key.json)"
  read -r KEY_FILE_PATH
  
  if [ ! -f "$KEY_FILE_PATH" ]; then
    echo "ERROR: File not found: ${KEY_FILE_PATH}"
    echo "Please run .deployment/scripts/gcp/setup-service-account.sh first"
    exit 1
  fi
  
  echo "Setting secret..."
  gh secret set GCP_SERVICE_ACCOUNT_KEY -R "$REPO" < "$KEY_FILE_PATH"
  echo "Secret created"
  
  echo ""
  echo "IMPORTANT: Delete the local key file after confirming deployment works"
  echo "   rm ${KEY_FILE_PATH}"
fi

# Summary
echo ""
echo "================================================================"
echo "  Setup Complete!"
echo "================================================================"
echo ""
echo "GitHub Secrets configured for repository: ${REPO}"
echo ""
echo "For next steps, see .deployment/DEPLOYMENT.md (Phase 1, Step 1.3)"
echo ""

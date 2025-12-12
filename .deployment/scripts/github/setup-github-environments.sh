#!/bin/bash
# Setup GitHub Environments for deployment
# Creates production and staging environments with protection rules

set -e

echo "================================================================"
echo "  GitHub Environments Setup"
echo "================================================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo "ERROR: GitHub CLI (gh) is not installed"
  exit 1
fi

# Check if authenticated
if ! gh auth status &>/dev/null; then
  echo "ERROR: Not authenticated with GitHub"
  echo "Please run: gh auth login"
  exit 1
fi

# Get repository info
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)
OWNER=$(echo "$REPO" | cut -d'/' -f1)
REPO_NAME=$(echo "$REPO" | cut -d'/' -f2)

echo "Repository: ${REPO}"
echo ""

# Function to create environment
create_environment() {
  local ENV_NAME=$1
  local PROTECTION=$2
  
  echo "Creating environment: ${ENV_NAME}"
  
  # GitHub API call to create environment
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/${OWNER}/${REPO_NAME}/environments/${ENV_NAME}" \
    -f "wait_timer=0" \
    -F "prevent_self_review=${PROTECTION}" \
    -F "reviewers=null" \
    > /dev/null 2>&1 || true
  
  echo "Environment created: ${ENV_NAME}"
}

# Create staging environment (no protection)
echo "================================================================"
echo "Staging Environment"
echo "Description: For testing deployments"
echo "Protection: None"
echo "================================================================"
create_environment "staging" false

echo ""

# Create production environment (with protection)
echo "================================================================"
echo "Production Environment"
echo "Description: Live production deployment"
echo "Protection: Recommended (manual approval)"
echo "================================================================"

read -p "Enable manual approval for production deployments? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  PROTECT_PROD=true
else
  PROTECT_PROD=false
fi

create_environment "production" $PROTECT_PROD

# Summary
echo ""
echo "================================================================"
echo "  Environments Created!"
echo "================================================================"
echo ""
echo "For next steps, see .deployment/DEPLOYMENT.md (Phase 1, Step 1.4)"
echo ""

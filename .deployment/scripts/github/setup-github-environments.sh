#!/bin/bash
# Setup GitHub Environments for deployment
# Creates production and staging environments with protection rules

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "================================================================"
echo "  🌍 GitHub Environments Setup"
echo "================================================================"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
  echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
  exit 1
fi

# Check if authenticated
if ! gh auth status &>/dev/null; then
  echo -e "${RED}❌ Not authenticated with GitHub${NC}"
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
  
  echo "🔄 Creating environment: ${ENV_NAME}"
  
  # GitHub API call to create environment
  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "/repos/${OWNER}/${REPO_NAME}/environments/${ENV_NAME}" \
    -f "wait_timer=0" \
    -F "prevent_self_review=${PROTECTION}" \
    -F "reviewers=null" \
    > /dev/null 2>&1 || true
  
  echo -e "${GREEN}✅ Environment created: ${ENV_NAME}${NC}"
}

# Create staging environment (no protection)
echo "================================================================"
echo -e "${BLUE}Staging Environment${NC}"
echo "Description: For testing deployments"
echo "Protection: None"
echo "================================================================"
create_environment "staging" false

echo ""

# Create production environment (with protection)
echo "================================================================"
echo -e "${BLUE}Production Environment${NC}"
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
echo "  ✅ Environments Created!"
echo "================================================================"
echo ""
echo "View environments:"
echo "  https://github.com/${REPO}/settings/environments"
echo ""
echo "Configure environment-specific secrets or protection rules in GitHub:"
echo "  Repository → Settings → Environments → [Environment Name]"
echo ""
echo "Environment URLs will be automatically set after first deployment."
echo ""

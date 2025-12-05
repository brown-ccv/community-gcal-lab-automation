#!/bin/bash
# Validate GitHub Secrets configuration
# Verifies that all required secrets are set

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================================"
echo "  ✅ GitHub Secrets Validation"
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
echo "Repository: ${REPO}"
echo ""

# Required secrets
REQUIRED_SECRETS=("GCP_SERVICE_ACCOUNT_KEY")

# Validation
echo "🔍 Checking required secrets..."
echo ""

ALL_VALID=true

for SECRET in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list | grep -q "$SECRET"; then
    echo -e "${GREEN}✅ ${SECRET}${NC}"
  else
    echo -e "${RED}❌ ${SECRET} - NOT FOUND${NC}"
    ALL_VALID=false
  fi
done

echo ""

if [ "$ALL_VALID" = true ]; then
  echo -e "${GREEN}================================================================${NC}"
  echo -e "${GREEN}  ✅ All required secrets are configured!${NC}"
  echo -e "${GREEN}================================================================${NC}"
  echo ""
  echo "You can now deploy using GitHub Actions."
  echo ""
  exit 0
else
  echo -e "${RED}================================================================${NC}"
  echo -e "${RED}  ❌ Missing required secrets${NC}"
  echo -e "${RED}================================================================${NC}"
  echo ""
  echo "Run: ./.deployment/scripts/github/setup-github-secrets.sh"
  echo ""
  exit 1
fi

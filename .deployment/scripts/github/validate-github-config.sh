#!/bin/bash
# Validate GitHub Secrets configuration
# Verifies that all required secrets are set

set -e

echo "================================================================"
echo "  GitHub Secrets Validation"
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
echo "Repository: ${REPO}"
echo ""

# Required secrets
REQUIRED_SECRETS=("GCP_SERVICE_ACCOUNT_KEY")

# Validation
echo "Checking required secrets..."
echo ""

ALL_VALID=true

for SECRET in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list | grep -q "$SECRET"; then
    echo "✅ ${SECRET}"
  else
    echo "❌ ${SECRET} - NOT FOUND"
    ALL_VALID=false
  fi
done

echo ""

if [ "$ALL_VALID" = true ]; then
  echo "================================================================"
  echo "  All required secrets are configured!"
  echo "================================================================"
  echo ""
  echo "You can now deploy using GitHub Actions."
  echo ""
  exit 0
else
  echo "================================================================"
  echo "  Missing required secrets"
  echo "================================================================"
  echo ""
  echo "Run: ./.deployment/scripts/github/setup-github-secrets.sh"
  echo ""
  exit 1
fi

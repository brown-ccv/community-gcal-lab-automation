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
  echo "Required scopes: repo, workflow, admin:org, admin:repo_hook"
  exit 1
fi

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
echo "Validating secrets for: ${REPO}"
echo ""

# Verify access to secrets API
echo "Verifying permissions..."
if ! gh api "repos/${REPO}/actions/secrets/public-key" &>/dev/null; then
  echo ""
  echo "================================================================"
  echo "  ERROR: Cannot access repository secrets"
  echo "================================================================"
  echo ""
  echo "You need additional GitHub CLI permissions."
  echo ""
  echo "Fix this by running:"
  echo "  gh auth refresh -s admin:org,repo,workflow,admin:repo_hook"
  echo ""
  echo "Or re-authenticate:"
  echo "  gh auth logout"
  echo "  gh auth login"
  echo ""
  exit 1
fi

echo "Permissions verified"
echo ""

# Required secrets
REQUIRED_SECRETS=("GCP_SERVICE_ACCOUNT_KEY")

# Validation
echo "Checking required secrets..."
echo ""

ALL_VALID=true

for SECRET in "${REQUIRED_SECRETS[@]}"; do
  if gh secret list -R "$REPO" | grep -q "$SECRET"; then
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

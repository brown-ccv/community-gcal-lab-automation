# 🚀 Cloud Run Deployment Guide

Complete deployment documentation for deploying the Google Calendar Lab Automation application to Google Cloud Run.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Architecture](#architecture)
- [Phase 1: 🔍 Prepare](#phase-1--prepare)
- [Phase 2: 🚀 Deploy](#phase-2--deploy)
- [Phase 3: 🧹 Teardown](#phase-3--teardown)
- [Manual Deployment](#manual-deployment)
- [Troubleshooting](#troubleshooting)
- [Cost Estimate](#cost-estimate)

---

## Overview

This application is deployed to **Google Cloud Run**, a fully managed serverless platform that automatically scales based on traffic. The deployment uses:

- **Platform**: Google Cloud Run
- **Region**: `us-east1` (closest to Providence, RI)
- **Container**: Node.js 18 Alpine with Express.js
- **CI/CD**: GitHub Actions with 3-phase deployment (prepare/deploy/teardown)
- **Secrets**: Google Cloud Secret Manager for runtime secrets
- **Authentication**: Google OAuth 2.0 with Brown University domain restriction

### Why Cloud Run?

- ✅ **Zero cost when idle**: No requests = no charges
- ✅ **Auto-scaling**: Handles 0-10 concurrent requests automatically
- ✅ **HTTPS included**: Automatic SSL certificates
- ✅ **Stable URLs**: Same URL across deployments
- ✅ **Fast deployment**: ~3-5 minutes
- ✅ **No maintenance**: Fully managed infrastructure

---

## Prerequisites

### Development Environment

**Recommended Setup**: Use GitHub Codespaces or a devcontainer for a consistent Linux environment with all tools pre-installed.

#### Option A: GitHub Codespaces (Recommended)

1. Navigate to the repository on GitHub
2. Click the **Code** button → **Codespaces** tab → **Create codespace on main**
3. Wait for the codespace to initialize
4. All required tools (gcloud, gh, docker) will be available

#### Option B: Local Devcontainer

1. Install [Docker Desktop](https://docs.docker.com/get-docker/)
2. Install [VS Code](https://code.visualstudio.com/) with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Clone the repository and open in VS Code
4. Click "Reopen in Container" when prompted
5. All required tools will be available inside the container

#### Option C: Local Linux Environment

If you prefer to work in your local Linux environment, install the following tools:

1. **Google Cloud SDK** (gcloud CLI)
   ```bash
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **GitHub CLI** (gh)
   ```bash
   # Ubuntu/Debian
   sudo apt install gh
   
   # Fedora/RHEL
   sudo dnf install gh
   ```

3. **Docker** (for local testing - optional)
   ```bash
   # Follow instructions at: https://docs.docker.com/engine/install/
   ```

### GCP Account Setup

1. **Create GCP Project** (one-time setup)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project: "gcal-lab-automation"
   - Enable billing (required for Cloud Run)
   - Note your PROJECT_ID

2. **Authenticate with GCP**
   ```bash
   # Login
   gcloud auth login
   
   # Set project
   gcloud config set project YOUR_PROJECT_ID
   
   # Configure Docker
   gcloud auth configure-docker us-east1-docker.pkg.dev
   ```

### GitHub Setup

1. **Authenticate GitHub CLI**
   ```bash
   gh auth login
   ```
   
   Select:
   - GitHub.com
   - HTTPS
   - Login with web browser
   
   **Required scopes**: `repo`, `workflow`, `admin:repo_hook`
   
   **Important**: If you've already authenticated but get "HTTP 403: Resource not accessible by integration" errors when running setup scripts, you need to refresh your authentication with the required scopes:
   ```bash
   gh auth refresh -s admin:org,repo,workflow,admin:repo_hook
   ```
   
   Or re-authenticate completely:
   ```bash
   gh auth logout
   gh auth login
   # Then select: repo, workflow, admin:org, admin:repo_hook scopes
   ```

2. **Fork/Clone Repository**
   
   **Option A: Using the original repository (recommended for Brown University)**
   ```bash
   git clone https://github.com/brown-ccv/community-gcal-lab-automation.git
   cd community-gcal-lab-automation
   ```
   
   **Option B: Using your own fork**
   
   If you've forked the repository to your own account:
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/community-gcal-lab-automation.git
   cd community-gcal-lab-automation
   
   # Set the repository context for gh CLI
   # This ensures GitHub Actions and secrets are configured in your fork
   gh repo set-default YOUR_USERNAME/community-gcal-lab-automation
   ```
   
   **Verify repository context:**
   ```bash
   # Check which repository gh CLI is using
   gh repo view --json nameWithOwner -q .nameWithOwner
   
   # Should output: brown-ccv/community-gcal-lab-automation (original)
   # Or: YOUR_USERNAME/community-gcal-lab-automation (your fork)
   ```
   
   **Note:** GitHub Actions workflows and secrets will be configured in whichever repository you're currently working with. Make sure you're in the correct repository directory before running the setup scripts.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub Actions                        │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐   │
│  │  Prepare   │→ │   Deploy   │→ │  Teardown (on fail) │   │
│  └────────────┘  └────────────┘  └─────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
              ┌────────────────────────┐
              │   Artifact Registry    │
              │  (Docker Image Store)  │
              └────────────┬───────────┘
                           │
                           ↓
              ┌────────────────────────┐
              │     Cloud Run Service   │
              │  ┌──────────────────┐  │
              │  │  Container (x1)  │  │
              │  │   Node.js 18     │  │
              │  │   Express.js     │  │
              │  │   Port: 8080     │  │
              │  └──────────────────┘  │
              └────────────┬───────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ↓                 ↓                  ↓
┌─────────────────┐ ┌──────────────┐ ┌──────────────────┐
│ Secret Manager  │ │   Calendar   │ │   OAuth 2.0      │
│  - Client ID    │ │     API      │ │   (brown.edu)    │
│  - Client Secret│ │              │ │                  │
│  - Session Key  │ │              │ │                  │
└─────────────────┘ └──────────────┘ └──────────────────┘
```

---

## Phase 1: 🔍 PREPARE

This phase sets up all required infrastructure and credentials.

### Step 1.1: Setup Service Account

**Purpose**: Create a service account with permissions to deploy and run the application.

```bash
# Navigate to deployment scripts
cd .deployment/scripts/gcp

# Run service account setup
./setup-service-account.sh
```

**What this script does**:
- Creates service account: `gcal-lab-automation-sa@PROJECT_ID.iam.gserviceaccount.com`
- Assigns IAM roles:
  - `roles/run.admin` - Deploy Cloud Run services
  - `roles/run.invoker` - Invoke services
  - `roles/iam.serviceAccountUser` - Use service account
  - `roles/secretmanager.secretAccessor` - Read secrets
  - `roles/artifactregistry.admin` - Create and manage Artifact Registry repositories
  - `roles/cloudbuild.builds.builder` - Build images
  - `roles/serviceusage.serviceUsageAdmin` - Enable and list APIs
  - `roles/logging.logWriter` - Write logs
  - `roles/cloudtrace.agent` - Send traces
  - `roles/monitoring.metricWriter` - Write metrics
- Generates service account key: `/tmp/gcal-lab-automation-sa-key.json`
- Enables required APIs

**Output**:
```
Service Account: gcal-lab-automation-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
Key File: /tmp/gcal-lab-automation-sa-key.json
```

### Step 1.2: Setup GCP Secrets

**Purpose**: Store application secrets securely in Google Cloud Secret Manager.

```bash
# Run secrets setup
./setup-gcp-secrets.sh
```

**Required values** (gather these first):

1. **Google OAuth 2.0 Setup**
   
   **First, configure OAuth Consent Screen:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to: APIs & Services → OAuth consent screen
   - User Type: **Internal** (for Brown University users only)
   - App name: "GCal Lab Automation"
   - **User support email**: Your administrator email address (required)
   - **Developer contact email**: Your administrator email address (required)
   - Scopes: Add `https://www.googleapis.com/auth/calendar`
   - Save and continue
   
   **Then, create OAuth credentials:**
   - Navigate to: APIs & Services → Credentials
   - Click: Create Credentials → OAuth client ID
   - Application type: **Web application**
   - Name: "GCal Lab Automation"
   - **Authorized redirect URIs** (IMPORTANT - add these exact URLs):
     - Click: **+ ADD URI**
     - Add: `http://localhost:3000/auth/google/callback` (for local testing)
     - Click: **+ ADD URI** again
     - Add: `https://gcal-lab-automation-HASH-us-east1.a.run.app/auth/google/callback` 
       - Note: Replace HASH with your actual Cloud Run service URL after deployment
       - You'll update this in Step 2.6 after deployment
   - Click: **Create**
   - **Copy** the Client ID and Client Secret (you'll need them in the next step)
   
   > **⚠️ Important**: The redirect URI must exactly match the URL your application uses. After deploying to Cloud Run, you MUST return to this configuration and update the redirect URI with your actual service URL (see Step 2.6).

2. **SESSION_SECRET**
   - Auto-generated by script (random 64-character hex string)
   - Or generate manually:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```

3. **REMINDER_CALENDAR_ID** & **RETENTION_CALENDAR_ID**
   - Open [Google Calendar](https://calendar.google.com/)
   - Create or select calendar for BURST reminders
   - Settings → Integrate calendar → Calendar ID
   - Format: `xxxxxxxxxxxxx@group.calendar.google.com`
   - Repeat for retention calendar

**Interactive prompts**:
```
Secret: auth-client-id
Enter value (input hidden): [paste OAuth Client ID]

Secret: auth-client-secret
Enter value (input hidden): [paste OAuth Client Secret]

Secret: session-secret
Auto-generated: [random hex string]

Secret: reminder-calendar-id
Enter value (input hidden): [paste calendar ID]

Secret: retention-calendar-id
Enter value (input hidden): [paste calendar ID]
```

**Verify secrets**:
```bash
# List all secrets
gcloud secrets list --project=YOUR_PROJECT_ID

# View secret metadata (not value)
gcloud secrets describe auth-client-id --project=YOUR_PROJECT_ID
```

### Step 1.3: Setup GitHub Secrets

**Purpose**: Store GCP service account key in GitHub for CI/CD authentication.

```bash
# Navigate to GitHub scripts
cd ../github

# Run GitHub secrets setup
./setup-github-secrets.sh
```

**Interactive prompts**:
```
Enter the path to your service account key JSON file:
(e.g., /tmp/gcal-lab-automation-sa-key.json)
> /tmp/gcal-lab-automation-sa-key.json

✅ Secret created
```

**Alternative - Manual setup**:
```bash
# Using GitHub CLI
gh secret set GCP_SERVICE_ACCOUNT_KEY < /tmp/gcal-lab-automation-sa-key.json

# Or via GitHub UI:
# 1. Go to: https://github.com/YOUR_ORG/community-gcal-lab-automation/settings/secrets/actions
# 2. Click: New repository secret
# 3. Name: GCP_SERVICE_ACCOUNT_KEY
# 4. Value: [paste entire JSON content]
# 5. Click: Add secret
```

**Verify**:
```bash
# Run validation script
./validate-github-config.sh

# Or check manually
gh secret list
```

### Step 1.4: Setup GitHub Environments (Optional)

**Purpose**: Create staging and production environments with protection rules.

```bash
# Run environments setup
./setup-github-environments.sh
```

**Environments created**:
- **staging**: No protection, for testing
- **production**: Optional manual approval

**Configure protection rules** (optional):
1. Go to: `https://github.com/YOUR_ORG/community-gcal-lab-automation/settings/environments`
2. Click: production
3. Enable: Required reviewers
4. Add: Your GitHub username
5. Save

### Step 1.5: Delete Service Account Key

**IMPORTANT**: After confirming GitHub secret is set, delete the local key file.

```bash
# Verify secret is set
gh secret list | grep GCP_SERVICE_ACCOUNT_KEY

# Delete key file
rm /tmp/gcal-lab-automation-sa-key.json

# Verify deletion
ls /tmp/*.json
```

---

## Phase 2: 🚀 DEPLOY

### Option A: GitHub Actions (Recommended)

**Advantages**:
- ✅ Automated 3-phase deployment
- ✅ Built-in validation and rollback
- ✅ Deployment logs and artifacts
- ✅ Environment protection
- ✅ No local Docker required

**Steps**:

1. **Navigate to Actions tab**
   ```
   https://github.com/YOUR_ORG/community-gcal-lab-automation/actions
   ```

2. **Select workflow**
   - Click: "🚀 Deploy to Google Cloud Run"

3. **Run workflow**
   - Click: "Run workflow" button
   - Select branch: `main`
   - Select environment: `staging` or `production`
   - Select region: `us-east1`
   - Click: "Run workflow"

4. **Monitor deployment**
   - Watch real-time logs
   - Three phases: Prepare → Deploy → Teardown (if failure)
   - Duration: ~5-8 minutes

5. **Get service URL**
   - Scroll to "Deploy Application" job
   - Find: "🚀 Deploy to Cloud Run" step
   - Copy service URL: `https://gcal-lab-automation-HASH-us-east1.a.run.app`

**Deployment output example**:
```
✅ Service URL: https://gcal-lab-automation-abc123-us-east1.a.run.app
✅ Health check passed (HTTP 200)
✅ Deployment successful!
```

### Option B: Manual Deployment

**When to use**: Local testing, debugging, or no GitHub Actions access.

#### Step 2.1: Build Docker Image

```bash
# Navigate to project root
cd /path/to/community-gcal-lab-automation

# Build image
docker build \
  -f .deployment/Dockerfile \
  -t gcal-lab-automation:latest \
  .

# Verify build
docker images | grep gcal-lab-automation
```

**Build parameters explained**:
- `-f .deployment/Dockerfile`: Use deployment Dockerfile
- `-t gcal-lab-automation:latest`: Tag image
- `.`: Build context (project root)

#### Step 2.2: Test Locally (Optional)

```bash
# Run container locally
docker run -d \
  --name gcal-test \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e DEMO_MODE=true \
  -e BYPASS_AUTH=true \
  gcal-lab-automation:latest

# Check logs
docker logs -f gcal-test

# Test health endpoint
curl http://localhost:8080/health

# Test web interface
open http://localhost:8080

# Cleanup
docker stop gcal-test
docker rm gcal-test
```

#### Step 2.3: Push to Artifact Registry

```bash
# Set variables
PROJECT_ID=$(gcloud config get-value project)
REGION="us-east1"
IMAGE_NAME="gcal-lab-automation"

# Create Artifact Registry (if not exists)
gcloud artifacts repositories create cloud-run-source-deploy \
  --repository-format=docker \
  --location=${REGION} \
  --description="Docker repository for Cloud Run" \
  --project=${PROJECT_ID}

# Tag image for registry
docker tag gcal-lab-automation:latest \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${IMAGE_NAME}:latest

# Push image
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${IMAGE_NAME}:latest
```

#### Step 2.4: Deploy to Cloud Run

```bash
# Deploy service
gcloud run deploy gcal-lab-automation \
  --image=${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${IMAGE_NAME}:latest \
  --region=${REGION} \
  --platform=managed \
  --service-account=gcal-lab-automation-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=300 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,DEMO_MODE=false,BYPASS_AUTH=false,AUTH_MODE=proxy,ALLOWED_DOMAIN=brown.edu" \
  --set-secrets="AUTH_CLIENT_ID=auth-client-id:latest,AUTH_CLIENT_SECRET=auth-client-secret:latest,SESSION_SECRET=session-secret:latest,REMINDER_CALENDAR_ID=reminder-calendar-id:latest,RETENTION_CALENDAR_ID=retention-calendar-id:latest" \
  --project=${PROJECT_ID} \
  --quiet
```

**Deployment flags explained**:
- `--no-allow-unauthenticated`: Require Cloud Run edge authentication (single login)
- `--port=8080`: Container port (Cloud Run standard)
- `--cpu=1`: 1 vCPU per instance
- `--memory=512Mi`: 512MB RAM per instance
- `--timeout=300`: 5-minute request timeout
- `--min-instances=0`: Scale to zero when idle (cost savings)
- `--max-instances=10`: Maximum concurrent instances
- `--set-env-vars`: Non-sensitive configuration
- `--set-secrets`: Reference secrets from Secret Manager

**Note**: Cloud Run automatically sets the `PORT` environment variable (usually 8080). Do NOT set it manually in `--set-env-vars` as it's a reserved variable.

#### Step 2.5: Get Service URL

```bash
# Get service URL
gcloud run services describe gcal-lab-automation \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(status.url)"
```

**Example output**:
```
https://gcal-lab-automation-abc123xyz-us-east1.a.run.app
```

### Step 2.6: Update OAuth Redirect URI

**CRITICAL**: Update Google OAuth credentials with production URL.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to: **APIs & Services → Credentials**
3. Click on: **Your OAuth 2.0 Client ID** (named "GCal Lab Automation")
4. Under **"Authorized redirect URIs"**:
   - Locate the placeholder URI you added earlier: `https://gcal-lab-automation-HASH-us-east1.a.run.app/auth/google/callback`
   - Click the **edit/pencil icon** next to it
   - Replace it with your actual Cloud Run service URL from Step 2.5
   - Example: `https://gcal-lab-automation-abc123xyz-us-east1.a.run.app/auth/google/callback`
   - Ensure `/auth/google/callback` is at the end of the URL
5. Click: **Save**
6. Wait 5 minutes for the changes to propagate

> **⚠️ Important**: OAuth will not work until this step is completed. The redirect URI must exactly match your Cloud Run service URL.

### Step 2.7: Verify Deployment

```bash
# Health check
SERVICE_URL=$(gcloud run services describe gcal-lab-automation \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(status.url)")

curl ${SERVICE_URL}/health

# Expected output: {"status":"ok","timestamp":"2025-12-05T..."}
```

**Manual verification**:
1. Open service URL in browser
2. Should redirect to Google OAuth login
3. Login with @brown.edu account
4. Verify home page loads
5. Test creating a calendar event

---

## Phase 3: 🧹 TEARDOWN

### Rollback Deployment

**When to rollback**: Deployment failed, service is broken, or need to revert changes.

```bash
# List revisions
gcloud run revisions list \
  --service=gcal-lab-automation \
  --region=us-east1 \
  --project=${PROJECT_ID}

# Rollback to previous revision
PREVIOUS_REVISION=$(gcloud run revisions list \
  --service=gcal-lab-automation \
  --region=us-east1 \
  --project=${PROJECT_ID} \
  --format="value(name)" \
  --sort-by="~creationTimestamp" \
  --limit=2 | tail -n 1)

gcloud run services update-traffic gcal-lab-automation \
  --region=us-east1 \
  --project=${PROJECT_ID} \
  --to-revisions=${PREVIOUS_REVISION}=100
```

**Automatic rollback**: GitHub Actions workflow automatically rolls back on deployment failure.

### Delete Service

**Warning**: This completely removes the deployed service.

```bash
# Delete Cloud Run service
gcloud run services delete gcal-lab-automation \
  --region=us-east1 \
  --project=${PROJECT_ID} \
  --quiet

# Delete Artifact Registry images (optional)
gcloud artifacts docker images delete \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/gcal-lab-automation:latest \
  --delete-tags \
  --quiet
```

### Cleanup Resources

**Full cleanup** (removes all infrastructure):

```bash
# Delete secrets
gcloud secrets delete auth-client-id --project=${PROJECT_ID} --quiet
gcloud secrets delete auth-client-secret --project=${PROJECT_ID} --quiet
gcloud secrets delete session-secret --project=${PROJECT_ID} --quiet
gcloud secrets delete reminder-calendar-id --project=${PROJECT_ID} --quiet
gcloud secrets delete retention-calendar-id --project=${PROJECT_ID} --quiet

# Delete service account
gcloud iam service-accounts delete \
  gcal-lab-automation-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --project=${PROJECT_ID} \
  --quiet

# Delete Artifact Registry (if no other services use it)
gcloud artifacts repositories delete cloud-run-source-deploy \
  --location=us-east1 \
  --project=${PROJECT_ID} \
  --quiet
```

---

## Manual Deployment

For advanced users who want full control.

### Prerequisites

- Docker installed
- gcloud CLI authenticated
- Service account and secrets configured

### Quick Deploy Script

```bash
#!/bin/bash
# Quick deployment script

set -e

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="us-east1"
SERVICE_NAME="gcal-lab-automation"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/cloud-run-source-deploy/${SERVICE_NAME}"

echo "🔨 Building Docker image..."
docker build -f .deployment/Dockerfile -t ${IMAGE}:latest .

echo "📤 Pushing to Artifact Registry..."
docker push ${IMAGE}:latest

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE}:latest \
  --region=${REGION} \
  --platform=managed \
  --service-account=${SERVICE_NAME}-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --timeout=300 \
  --min-instances=0 \
  --max-instances=10 \
  --set-env-vars="NODE_ENV=production,DEMO_MODE=false,BYPASS_AUTH=false,AUTH_MODE=proxy,ALLOWED_DOMAIN=brown.edu" \
  --set-secrets="AUTH_CLIENT_ID=auth-client-id:latest,AUTH_CLIENT_SECRET=auth-client-secret:latest,SESSION_SECRET=session-secret:latest,REMINDER_CALENDAR_ID=reminder-calendar-id:latest,RETENTION_CALENDAR_ID=retention-calendar-id:latest" \
  --project=${PROJECT_ID} \
  --quiet

echo "✅ Initial deployment complete!"

# Get the service URL
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="value(status.url)")

echo "Service URL: ${SERVICE_URL}"

# Set AUTH_CALLBACK_URL based on the deployed service URL
echo "🔗 Configuring AUTH_CALLBACK_URL..."
gcloud run services update ${SERVICE_NAME} \
  --region=${REGION} \
  --update-env-vars=AUTH_CALLBACK_URL="${SERVICE_URL}/auth/google/callback" \
  --project=${PROJECT_ID} \
  --quiet

echo "✅ AUTH_CALLBACK_URL configured: ${SERVICE_URL}/auth/google/callback"
```

Save as `.deployment/scripts/deploy.sh`, make executable, and run:

```bash
chmod +x .deployment/scripts/deploy.sh
./.deployment/scripts/deploy.sh
```

---

## Troubleshooting

### Common Issues

#### 1. "Permission denied" during deployment

**Symptoms**:
```
ERROR: (gcloud.run.deploy) PERMISSION_DENIED
```

**Solutions**:
```bash
# Verify service account has required roles
gcloud projects get-iam-policy ${PROJECT_ID} \
  --flatten="bindings[].members" \
  --filter="bindings.members:gcal-lab-automation-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Re-run service account setup
./.deployment/scripts/gcp/setup-service-account.sh
```

#### 2. Health check failing

**Symptoms**:
```
⚠️ Health check failed (HTTP 503)
```

**Solutions**:
```bash
# Check logs
gcloud run logs read --service=gcal-lab-automation --region=us-east1

# Common causes:
# - Application crashed on startup
# - Missing required secrets
# - PORT binding issues (Cloud Run automatically sets PORT env var)

# Verify secrets exist
gcloud secrets list --project=${PROJECT_ID}
```

#### 3. OAuth redirect mismatch

**Symptoms**:
```
Error: redirect_uri_mismatch
```

**Solutions**:
1. Get current Cloud Run URL:
   ```bash
   gcloud run services describe gcal-lab-automation \
     --region=us-east1 \
     --format="value(status.url)"
   ```

2. Go to Google Cloud Console → Credentials
3. Edit OAuth client
4. Add authorized redirect URI: `https://YOUR-URL/auth/google/callback`
5. Save and wait 5 minutes for propagation

#### 4. "Secret not found" error

**Symptoms**:
```
ERROR: Secret version [auth-client-id:latest] not found
```

**Solutions**:
```bash
# List secrets
gcloud secrets list --project=${PROJECT_ID}

# Re-run secrets setup
./.deployment/scripts/gcp/setup-gcp-secrets.sh

# Verify service account has access
gcloud secrets get-iam-policy auth-client-id --project=${PROJECT_ID}
```

#### 5. Build fails on Docker

**Symptoms**:
```
ERROR: failed to solve: process "/bin/sh -c npm ci" did not complete successfully
```

**Solutions**:
```bash
# Test build locally
docker build -f .deployment/Dockerfile -t test:latest .

# Check Node.js version
node --version  # Should be 18+

# Verify package-lock.json exists
ls -la package-lock.json

# Clean install
rm -rf node_modules package-lock.json
npm install
```

### View Logs

```bash
# Real-time logs
gcloud run logs tail --service=gcal-lab-automation --region=us-east1

# Last 100 lines
gcloud run logs read --service=gcal-lab-automation --region=us-east1 --limit=100

# Filter by severity
gcloud run logs read --service=gcal-lab-automation --region=us-east1 --log-filter="severity>=ERROR"

# Specific time range
gcloud run logs read --service=gcal-lab-automation --region=us-east1 \
  --log-filter='timestamp>="2025-12-05T00:00:00Z"'
```

### Debug Locally

```bash
# Run with GCP secrets locally (requires auth)
gcloud secrets versions access latest --secret=auth-client-id > /tmp/.env
# ... repeat for other secrets

# Run locally
DEMO_MODE=true BYPASS_AUTH=true npm start

# Or with Docker
docker run -p 8080:8080 \
  -e DEMO_MODE=true \
  -e BYPASS_AUTH=true \
  gcal-lab-automation:latest
```

### Get Support

1. **Check GitHub Actions logs**: Actions tab → Failed workflow → Job logs
2. **Check Cloud Run logs**: `gcloud run logs read`
3. **Verify configuration**: Run validation scripts
4. **Community**: Open issue on GitHub repository

---

## Cost Estimate

### Free Tier (included with GCP account)

- **Cloud Run**: 
  - 2 million requests/month
  - 360,000 GB-seconds/month (memory)
  - 180,000 vCPU-seconds/month
- **Secret Manager**: 
  - 6 active secret versions
  - 10,000 access operations/month
- **Artifact Registry**: 
  - 0.5 GB storage

### Expected Usage (Lab with 20 users)

- **Requests**: ~1,000/month (well within free tier)
- **Memory**: ~5 GB-seconds/day = 150/month (within free tier)
- **vCPU**: ~2.5 vCPU-seconds/day = 75/month (within free tier)
- **Secrets**: 5 active versions (within free tier)
- **Storage**: ~200 MB (within free tier)

**Estimated monthly cost**: **$0.00** (entirely within free tier)

### Monitoring Costs

```bash
# Check current month usage
gcloud billing budgets list --project=${PROJECT_ID}

# Set budget alert (optional)
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="GCal Lab Automation Budget" \
  --budget-amount=10 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

---

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

---

**Last updated**: 2025-12-05  
**Platform**: Google Cloud Run  
**Region**: us-east1  
**Support**: Open issue on GitHub

// Authentication middleware
import { google } from 'googleapis';

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || 'brown.edu';
const BYPASS_AUTH = process.env.BYPASS_AUTH === 'true';
const AUTH_MODE = (process.env.AUTH_MODE || 'oauth').trim().toLowerCase();
const DIRECTORY_SCOPE = 'https://www.googleapis.com/auth/admin.directory.group.member.readonly';
const GROUP_CACHE_TTL_MS = parseInt(process.env.GROUP_MEMBERSHIP_CACHE_TTL_MS || '300000', 10);

const groupMembershipCache = new Map();
let directoryClient = null;

function isGroupEnforcementEnabled() {
  return process.env.REQUIRE_GROUP_MEMBERSHIP === 'true';
}

function getRequiredGroupEmail() {
  return (process.env.REQUIRED_GOOGLE_GROUP || '').trim().toLowerCase();
}

function getCacheKey(groupEmail, memberEmail) {
  return `${groupEmail}::${memberEmail}`;
}

function getCachedMembership(groupEmail, memberEmail) {
  const cacheKey = getCacheKey(groupEmail, memberEmail);
  const cacheEntry = groupMembershipCache.get(cacheKey);
  if (!cacheEntry) {
    return null;
  }

  if (Date.now() > cacheEntry.expiresAt) {
    groupMembershipCache.delete(cacheKey);
    return null;
  }

  return cacheEntry.isMember;
}

function setCachedMembership(groupEmail, memberEmail, isMember) {
  const cacheKey = getCacheKey(groupEmail, memberEmail);
  groupMembershipCache.set(cacheKey, {
    isMember,
    expiresAt: Date.now() + GROUP_CACHE_TTL_MS,
  });
}

function getAllowedGroupMembers() {
  return new Set(
    (process.env.ALLOWED_GROUP_MEMBERS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getDirectoryClient() {
  if (directoryClient) {
    return directoryClient;
  }

  const adminUser = (process.env.GOOGLE_ADMIN_USER_EMAIL || '').trim();
  const serviceAccountJsonRaw = process.env.GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON;
  if (!adminUser || !serviceAccountJsonRaw) {
    return null;
  }

  try {
    const credentials = JSON.parse(serviceAccountJsonRaw);
    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: String(credentials.private_key || '').replace(/\\n/g, '\n'),
      scopes: [DIRECTORY_SCOPE],
      subject: adminUser,
    });

    directoryClient = google.admin({
      version: 'directory_v1',
      auth: jwtClient,
    });

    return directoryClient;
  } catch (error) {
    console.error('Failed to initialize Google Directory client:', error.message);
    return null;
  }
}

async function isMemberViaDirectoryApi(groupEmail, memberEmail) {
  const client = getDirectoryClient();
  if (!client) {
    return null;
  }

  const cachedValue = getCachedMembership(groupEmail, memberEmail);
  if (cachedValue !== null) {
    return cachedValue;
  }

  try {
    const response = await client.members.hasMember({
      groupKey: groupEmail,
      memberKey: memberEmail,
    });

    const isMember = response.data?.isMember === true;
    setCachedMembership(groupEmail, memberEmail, isMember);
    return isMember;
  } catch (error) {
    console.error(`Directory membership lookup failed for ${memberEmail}:`, error.message);
    return null;
  }
}

async function isAuthorizedGroupMember(memberEmail) {
  const requiredGroup = getRequiredGroupEmail();
  const normalizedEmail = String(memberEmail || '').toLowerCase();

  if (requiredGroup) {
    const directoryResult = await isMemberViaDirectoryApi(requiredGroup, normalizedEmail);
    if (directoryResult !== null) {
      return directoryResult;
    }
  }

  // Fallback allowlist for local/dev while Directory API is not configured.
  const allowedMembers = getAllowedGroupMembers();
  if (allowedMembers.size === 0) {
    return null;
  }

  return allowedMembers.has(normalizedEmail);
}

function normalizeProxyEmail(rawEmail) {
  if (!rawEmail || typeof rawEmail !== 'string') {
    return null;
  }

  const trimmed = rawEmail.trim();
  const prefixed = 'accounts.google.com:';

  if (trimmed.startsWith(prefixed)) {
    return trimmed.slice(prefixed.length).trim().toLowerCase();
  }

  return trimmed.toLowerCase();
}

/**
 * Extract authenticated identity from trusted proxy headers (IAP) when present.
 */
export function extractProxyIdentity(req, res, next) {
  const headerEmail = req.get('x-goog-authenticated-user-email');
  const normalizedHeaderEmail = normalizeProxyEmail(headerEmail);

  if (normalizedHeaderEmail) {
    req.authIdentity = {
      email: normalizedHeaderEmail,
      source: 'iap-header',
    };
    return next();
  }

  req.authIdentity = null;
  return next();
}

export function getAuthenticatedEmail(req) {
  if (req?.authIdentity?.email) {
    return req.authIdentity.email;
  }

  if (req?.user?.email) {
    return String(req.user.email).toLowerCase();
  }

  return null;
}

export function isProxyAuthMode() {
  return AUTH_MODE === 'proxy';
}

/**
 * Middleware to require authentication for protected routes
 * Can be bypassed in development with BYPASS_AUTH=true
 */
export function requireAuth(req, res, next) {
  if (isProxyAuthMode()) {
    return next();
  }

  // Safety check: never bypass auth in production
  if (BYPASS_AUTH && process.env.NODE_ENV === 'production') {
    console.error('SECURITY ERROR: Cannot bypass authentication in production!');
    process.exit(1);
  }

  // If auth bypass is enabled (development only), skip authentication
  if (BYPASS_AUTH) {
    console.log('⚠️  Authentication bypassed (BYPASS_AUTH=true)');
    return next();
  }

  // Check if user is authenticated
  if (req.isAuthenticated()) {
    return next();
  }

  // Accept identity propagated by trusted proxy/IAP headers.
  if (getAuthenticatedEmail(req)) {
    return next();
  }

  // Not authenticated - redirect to login
  res.redirect('/login.html');
}

/**
 * Verify that the authenticated user has an allowed email domain
 * CASE-SENSITIVE: Only exact @brown.edu is allowed
 */
export function verifyDomain(email) {
  if (!email) {
    return false;
  }

  // IMPORTANT: Case-sensitive check
  // Only @brown.edu (lowercase) is valid
  // brown.edu is the ONLY domain generated by the organization
  return email.endsWith('@' + ALLOWED_DOMAIN);
}

/**
 * Enforce explicit group membership on protected routes.
 */
export async function requireGroupMember(req, res, next) {
  if (isProxyAuthMode()) {
    return next();
  }

  if (!isGroupEnforcementEnabled()) {
    return next();
  }

  const email = getAuthenticatedEmail(req);
  if (!email) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const groupResult = await isAuthorizedGroupMember(email);
  if (groupResult === null) {
    return res.status(500).json({
      error: 'Group enforcement is enabled but group lookup is not configured',
    });
  }

  if (!groupResult) {
    return res.status(403).json({ error: 'Access denied: user is not in the required group' });
  }

  return next();
}

/**
 * Check if authentication is currently bypassed
 */
export function isAuthBypassed() {
  return BYPASS_AUTH;
}

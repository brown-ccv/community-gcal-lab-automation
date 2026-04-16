import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const middlewareModuleUrl = pathToFileURL(
  path.resolve(process.cwd(), 'src/middleware/auth.js')
).href;

function buildReq(overrides = {}) {
  return {
    authIdentity: null,
    user: null,
    headers: {},
    get(name) {
      return this.headers[name.toLowerCase()] ?? this.headers[name] ?? undefined;
    },
    isAuthenticated() {
      return false;
    },
    ...overrides,
  };
}

function buildRes() {
  return {
    redirectedTo: null,
    statusCode: null,
    body: null,
    redirect(pathname) {
      this.redirectedTo = pathname;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

async function loadMiddleware() {
  return import(`${middlewareModuleUrl}?t=${Date.now()}-${Math.random()}`);
}

test('verifyDomain only allows exact configured domain', async () => {
  const originalDomain = process.env.ALLOWED_DOMAIN;
  process.env.ALLOWED_DOMAIN = 'brown.edu';

  const { verifyDomain } = await loadMiddleware();

  assert.equal(verifyDomain('person@brown.edu'), true);
  assert.equal(verifyDomain('person@Brown.edu'), false);
  assert.equal(verifyDomain('person@example.com'), false);
  assert.equal(verifyDomain('person@brown.edu.extra'), false);

  if (originalDomain === undefined) {
    delete process.env.ALLOWED_DOMAIN;
  } else {
    process.env.ALLOWED_DOMAIN = originalDomain;
  }
});

test('extractProxyIdentity reads IAP email header and normalizes value', async () => {
  const { extractProxyIdentity, getAuthenticatedEmail } = await loadMiddleware();
  const req = buildReq({
    headers: {
      'x-goog-authenticated-user-email': 'accounts.google.com:Member@Brown.edu',
    },
  });
  const res = buildRes();

  let nextCalled = false;
  extractProxyIdentity(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.authIdentity, {
    email: 'member@brown.edu',
    source: 'iap-header',
  });
  assert.equal(getAuthenticatedEmail(req), 'member@brown.edu');
});

test('requireAuth allows access when session user exists', async () => {
  const { requireAuth } = await loadMiddleware();
  const req = buildReq({
    isAuthenticated() {
      return true;
    },
  });
  const res = buildRes();

  let nextCalled = false;
  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.redirectedTo, null);
});

test('requireAuth allows access when only proxy identity exists', async () => {
  const { requireAuth } = await loadMiddleware();
  const req = buildReq({
    authIdentity: {
      email: 'member@brown.edu',
      source: 'iap-header',
    },
  });
  const res = buildRes();

  let nextCalled = false;
  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.redirectedTo, null);
});

test('requireAuth redirects unauthenticated requests to login', async () => {
  const { requireAuth } = await loadMiddleware();
  const req = buildReq();
  const res = buildRes();

  let nextCalled = false;
  requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.redirectedTo, '/login.html');
});

test('requireGroupMember denies when group enforcement is on and user is not allowed', async () => {
  const originalFlag = process.env.REQUIRE_GROUP_MEMBERSHIP;
  const originalMembers = process.env.ALLOWED_GROUP_MEMBERS;
  const originalRequiredGroup = process.env.REQUIRED_GOOGLE_GROUP;

  process.env.REQUIRE_GROUP_MEMBERSHIP = 'true';
  process.env.ALLOWED_GROUP_MEMBERS = 'allowed@brown.edu';
  delete process.env.REQUIRED_GOOGLE_GROUP;

  const { requireGroupMember } = await loadMiddleware();
  const req = buildReq({
    authIdentity: { email: 'blocked@brown.edu', source: 'iap-header' },
  });
  const res = buildRes();

  let nextCalled = false;
  await requireGroupMember(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: 'Access denied: user is not in the required group' });

  if (originalFlag === undefined) {
    delete process.env.REQUIRE_GROUP_MEMBERSHIP;
  } else {
    process.env.REQUIRE_GROUP_MEMBERSHIP = originalFlag;
  }

  if (originalMembers === undefined) {
    delete process.env.ALLOWED_GROUP_MEMBERS;
  } else {
    process.env.ALLOWED_GROUP_MEMBERS = originalMembers;
  }

  if (originalRequiredGroup === undefined) {
    delete process.env.REQUIRED_GOOGLE_GROUP;
  } else {
    process.env.REQUIRED_GOOGLE_GROUP = originalRequiredGroup;
  }
});

test('requireGroupMember allows request when user is explicitly allowed', async () => {
  const originalFlag = process.env.REQUIRE_GROUP_MEMBERSHIP;
  const originalMembers = process.env.ALLOWED_GROUP_MEMBERS;
  const originalRequiredGroup = process.env.REQUIRED_GOOGLE_GROUP;

  process.env.REQUIRE_GROUP_MEMBERSHIP = 'true';
  process.env.ALLOWED_GROUP_MEMBERS = 'allowed@brown.edu,other@brown.edu';
  delete process.env.REQUIRED_GOOGLE_GROUP;

  const { requireGroupMember } = await loadMiddleware();
  const req = buildReq({
    authIdentity: { email: 'allowed@brown.edu', source: 'iap-header' },
  });
  const res = buildRes();

  let nextCalled = false;
  await requireGroupMember(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null);

  if (originalFlag === undefined) {
    delete process.env.REQUIRE_GROUP_MEMBERSHIP;
  } else {
    process.env.REQUIRE_GROUP_MEMBERSHIP = originalFlag;
  }

  if (originalMembers === undefined) {
    delete process.env.ALLOWED_GROUP_MEMBERS;
  } else {
    process.env.ALLOWED_GROUP_MEMBERS = originalMembers;
  }

  if (originalRequiredGroup === undefined) {
    delete process.env.REQUIRED_GOOGLE_GROUP;
  } else {
    process.env.REQUIRED_GOOGLE_GROUP = originalRequiredGroup;
  }
});

test('requireGroupMember returns 500 when enforcement is on and no lookup source is configured', async () => {
  const originalFlag = process.env.REQUIRE_GROUP_MEMBERSHIP;
  const originalMembers = process.env.ALLOWED_GROUP_MEMBERS;
  const originalRequiredGroup = process.env.REQUIRED_GOOGLE_GROUP;
  const originalAdminUser = process.env.GOOGLE_ADMIN_USER_EMAIL;
  const originalAdminJson = process.env.GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON;

  process.env.REQUIRE_GROUP_MEMBERSHIP = 'true';
  process.env.REQUIRED_GOOGLE_GROUP = 'carelab-group@brown.edu';
  process.env.ALLOWED_GROUP_MEMBERS = '';
  delete process.env.GOOGLE_ADMIN_USER_EMAIL;
  delete process.env.GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON;

  const { requireGroupMember } = await loadMiddleware();
  const req = buildReq({
    authIdentity: { email: 'allowed@brown.edu', source: 'iap-header' },
  });
  const res = buildRes();

  let nextCalled = false;
  await requireGroupMember(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    error: 'Group enforcement is enabled but group lookup is not configured',
  });

  if (originalFlag === undefined) {
    delete process.env.REQUIRE_GROUP_MEMBERSHIP;
  } else {
    process.env.REQUIRE_GROUP_MEMBERSHIP = originalFlag;
  }

  if (originalMembers === undefined) {
    delete process.env.ALLOWED_GROUP_MEMBERS;
  } else {
    process.env.ALLOWED_GROUP_MEMBERS = originalMembers;
  }

  if (originalRequiredGroup === undefined) {
    delete process.env.REQUIRED_GOOGLE_GROUP;
  } else {
    process.env.REQUIRED_GOOGLE_GROUP = originalRequiredGroup;
  }

  if (originalAdminUser === undefined) {
    delete process.env.GOOGLE_ADMIN_USER_EMAIL;
  } else {
    process.env.GOOGLE_ADMIN_USER_EMAIL = originalAdminUser;
  }

  if (originalAdminJson === undefined) {
    delete process.env.GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON;
  } else {
    process.env.GOOGLE_ADMIN_SERVICE_ACCOUNT_JSON = originalAdminJson;
  }
});

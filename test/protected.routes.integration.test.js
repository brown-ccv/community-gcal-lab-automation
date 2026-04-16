import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { extractProxyIdentity, requireAuth, requireGroupMember } from '../src/middleware/auth.js';

function createTestApp() {
  const app = express();

  app.use((req, res, next) => {
    const authMode = req.get('x-test-auth-mode');
    const testEmail = req.get('x-test-email') || null;

    req.user = null;
    req.isAuthenticated = () => false;

    if (authMode === 'session' && testEmail) {
      req.user = { email: testEmail, name: 'Test User' };
      req.isAuthenticated = () => true;
    }

    next();
  });

  app.use(extractProxyIdentity);

  app.get('/protected', requireAuth, requireGroupMember, (req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

async function startServer() {
  const app = createTestApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

test('protected route redirects unauthenticated requests', async () => {
  const { baseUrl, close } = await startServer();

  const response = await fetch(`${baseUrl}/protected`, { redirect: 'manual' });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login.html');

  await close();
});

test('protected route allows in-group session user', async () => {
  const originalRequireGroup = process.env.REQUIRE_GROUP_MEMBERSHIP;
  const originalAllowedMembers = process.env.ALLOWED_GROUP_MEMBERS;
  const originalRequiredGoogleGroup = process.env.REQUIRED_GOOGLE_GROUP;

  process.env.REQUIRE_GROUP_MEMBERSHIP = 'true';
  process.env.ALLOWED_GROUP_MEMBERS = 'carelab-member@brown.edu';
  delete process.env.REQUIRED_GOOGLE_GROUP;

  const { baseUrl, close } = await startServer();

  const response = await fetch(`${baseUrl}/protected`, {
    headers: {
      'x-test-auth-mode': 'session',
      'x-test-email': 'carelab-member@brown.edu',
    },
  });

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, { ok: true });

  await close();

  if (originalRequireGroup === undefined) {
    delete process.env.REQUIRE_GROUP_MEMBERSHIP;
  } else {
    process.env.REQUIRE_GROUP_MEMBERSHIP = originalRequireGroup;
  }

  if (originalAllowedMembers === undefined) {
    delete process.env.ALLOWED_GROUP_MEMBERS;
  } else {
    process.env.ALLOWED_GROUP_MEMBERS = originalAllowedMembers;
  }

  if (originalRequiredGoogleGroup === undefined) {
    delete process.env.REQUIRED_GOOGLE_GROUP;
  } else {
    process.env.REQUIRED_GOOGLE_GROUP = originalRequiredGoogleGroup;
  }
});

test('protected route denies out-of-group proxy-authenticated user', async () => {
  const originalRequireGroup = process.env.REQUIRE_GROUP_MEMBERSHIP;
  const originalAllowedMembers = process.env.ALLOWED_GROUP_MEMBERS;
  const originalRequiredGoogleGroup = process.env.REQUIRED_GOOGLE_GROUP;

  process.env.REQUIRE_GROUP_MEMBERSHIP = 'true';
  process.env.ALLOWED_GROUP_MEMBERS = 'carelab-member@brown.edu';
  delete process.env.REQUIRED_GOOGLE_GROUP;

  const { baseUrl, close } = await startServer();

  const response = await fetch(`${baseUrl}/protected`, {
    headers: {
      'x-goog-authenticated-user-email': 'accounts.google.com:blocked-user@brown.edu',
    },
  });

  assert.equal(response.status, 403);
  const body = await response.json();
  assert.equal(body.error, 'Access denied: user is not in the required group');

  await close();

  if (originalRequireGroup === undefined) {
    delete process.env.REQUIRE_GROUP_MEMBERSHIP;
  } else {
    process.env.REQUIRE_GROUP_MEMBERSHIP = originalRequireGroup;
  }

  if (originalAllowedMembers === undefined) {
    delete process.env.ALLOWED_GROUP_MEMBERS;
  } else {
    process.env.ALLOWED_GROUP_MEMBERS = originalAllowedMembers;
  }

  if (originalRequiredGoogleGroup === undefined) {
    delete process.env.REQUIRED_GOOGLE_GROUP;
  } else {
    process.env.REQUIRED_GOOGLE_GROUP = originalRequiredGoogleGroup;
  }
});

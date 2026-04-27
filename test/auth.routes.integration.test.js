import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { extractProxyIdentity } from '../src/middleware/auth.js';
import { createAuthRoutes } from '../src/routes/auth.js';

function createTestApp() {
  const app = express();

  app.use((req, res, next) => {
    const authMode = req.get('x-test-auth-mode');
    const testEmail = req.get('x-test-email') || null;

    req.user = null;
    req.isAuthenticated = () => false;

    if (authMode === 'session' && testEmail) {
      req.user = { email: testEmail, name: 'Test User', picture: null };
      req.isAuthenticated = () => true;
    }

    req.logout = (callback) => {
      req.user = null;
      req.isAuthenticated = () => false;
      callback?.();
    };

    req.session = {
      returnTo: '/csv-import.html',
      destroy: (callback) => callback?.(),
    };

    next();
  });

  app.use(extractProxyIdentity);
  createAuthRoutes(app);

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

test('logout route redirects to login confirmation page', async () => {
  const { baseUrl, close } = await startServer();

  const response = await fetch(`${baseUrl}/auth/logout`, { redirect: 'manual' });

  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/login.html?logged_out=true');

  await close();
});

test('api auth status is unauthenticated after session logout', async () => {
  const { baseUrl, close } = await startServer();

  const before = await fetch(`${baseUrl}/api/auth/status`, {
    headers: {
      'x-test-auth-mode': 'session',
      'x-test-email': 'carelab-member@brown.edu',
    },
  });
  const beforePayload = await before.json();
  assert.equal(beforePayload.authenticated, true);
  assert.equal(beforePayload.source, 'session');

  await fetch(`${baseUrl}/auth/logout`, {
    headers: {
      'x-test-auth-mode': 'session',
      'x-test-email': 'carelab-member@brown.edu',
    },
    redirect: 'manual',
  });

  const after = await fetch(`${baseUrl}/api/auth/status`);
  const afterPayload = await after.json();

  assert.equal(afterPayload.authenticated, false);

  await close();
});

test('api auth status remains authenticated via proxy identity after logout', async () => {
  const { baseUrl, close } = await startServer();

  const identityHeaders = {
    'x-goog-authenticated-user-email': 'accounts.google.com:carelab-member@brown.edu',
  };

  const before = await fetch(`${baseUrl}/api/auth/status`, {
    headers: identityHeaders,
  });
  const beforePayload = await before.json();
  assert.equal(beforePayload.authenticated, true);
  assert.equal(beforePayload.source, 'iap-header');

  await fetch(`${baseUrl}/auth/logout`, {
    headers: identityHeaders,
    redirect: 'manual',
  });

  const after = await fetch(`${baseUrl}/api/auth/status`, {
    headers: identityHeaders,
  });
  const afterPayload = await after.json();

  assert.equal(afterPayload.authenticated, true);
  assert.equal(afterPayload.source, 'iap-header');

  await close();
});

const serviceUrlRaw = process.env.SERVICE_URL || '';

if (!serviceUrlRaw) {
  console.error('SERVICE_URL is required');
  process.exit(1);
}

const serviceUrl = serviceUrlRaw.replace(/\/$/, '');

async function getJson(pathname, init = {}) {
  const response = await fetch(`${serviceUrl}${pathname}`, init);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : null;
  return { response, body };
}

async function run() {
  const health = await getJson('/health');
  if (health.response.status !== 200) {
    throw new Error(`/health returned ${health.response.status}`);
  }

  const healthBody = health.body || {};
  if (healthBody.status !== 'ok') {
    throw new Error('/health did not return status=ok');
  }

  const forbiddenHealthKeys = ['credentialsPath', 'credentialsExist', 'tokenExists', 'env'];
  const leakedKey = forbiddenHealthKeys.find((key) => Object.prototype.hasOwnProperty.call(healthBody, key));
  if (leakedKey) {
    throw new Error(`/health exposed forbidden key: ${leakedKey}`);
  }

  const login = await fetch(`${serviceUrl}/login.html`, { redirect: 'manual' });
  if (login.status !== 200) {
    throw new Error(`/login.html returned ${login.status}`);
  }

  const authStatus = await getJson('/api/auth/status');
  if (authStatus.response.status !== 200) {
    throw new Error(`/api/auth/status returned ${authStatus.response.status}`);
  }

  if (typeof authStatus.body?.authenticated !== 'boolean') {
    throw new Error('/api/auth/status response missing authenticated boolean');
  }

  const protectedRoute = await fetch(`${serviceUrl}/`, { redirect: 'manual' });
  const redirectStatusCodes = new Set([301, 302, 303, 307, 308]);
  if (!redirectStatusCodes.has(protectedRoute.status)) {
    throw new Error(`/ expected redirect, got ${protectedRoute.status}`);
  }

  const redirectLocation = protectedRoute.headers.get('location') || '';
  if (!redirectLocation.includes('/login.html')) {
    throw new Error(`/ redirected to unexpected location: ${redirectLocation || 'empty'}`);
  }

  console.log('Deployment verification checks passed');
}

run().catch((error) => {
  console.error('Deployment verification failed:', error.message);
  process.exit(1);
});

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
export const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
export const X_ME_URL = 'https://api.x.com/2/users/me';
export const DEFAULT_X_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
];

function base64url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

export function createPkcePair() {
  const verifier = base64url(randomBytes(48));
  const challenge = base64url(
    createHash('sha256').update(verifier).digest()
  );
  return { verifier, challenge };
}

export function createState() {
  return base64url(randomBytes(32));
}

export function safeEqualText(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeScopes(value = '') {
  const raw = String(value).trim();
  const scopes = raw ? raw.split(/\s+/) : DEFAULT_X_SCOPES;
  return [...new Set(scopes)].filter(Boolean);
}

export function buildAuthorizationUrl({
  clientId,
  redirectUri,
  state,
  challenge,
  scopes = DEFAULT_X_SCOPES,
}) {
  if (!clientId || !redirectUri || !state || !challenge) {
    throw new Error('X_OAUTH_AUTHORIZATION_INPUT_MISSING');
  }

  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scopes.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('X_OAUTH_UPSTREAM_ERROR');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function exchangeCode({
  clientId,
  clientSecret,
  redirectUri,
  code,
  verifier,
  fetchImpl = fetch,
}) {
  if (!clientId || !clientSecret || !redirectUri || !code || !verifier) {
    throw new Error('X_OAUTH_TOKEN_EXCHANGE_INPUT_MISSING');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  });

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetchImpl(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'goldcondorherald-x-oauth/2.0',
    },
    body,
    signal: AbortSignal.timeout(10000),
  });
  return readJson(response);
}

export async function getAuthenticatedUser({
  accessToken,
  fetchImpl = fetch,
}) {
  if (!accessToken) throw new Error('X_OAUTH_ACCESS_TOKEN_MISSING');

  const response = await fetchImpl(X_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'goldcondorherald-x-oauth/2.0',
    },
    signal: AbortSignal.timeout(10000),
  });
  return readJson(response);
}

// Stage 2.5 adds encrypted durable token persistence, while deliberately
// retaining the Stage 2 rule that no X post-creation path exists.
export function publicOAuthStatus(env = process.env) {
  const scopes = normalizeScopes(env.X_OAUTH_SCOPES || '');
  const tokenStoreEnabled = /^(1|true|yes)$/i.test(
    env.X_TOKEN_STORE_ENABLED || ''
  );
  const tokenStoreConfigured = Boolean(
    env.X_TOKEN_VAULT_URL &&
      env.X_TOKEN_VAULT_SECRET &&
      env.X_TOKEN_ENCRYPTION_KEY
  );
  return {
    status: 'X_STAGE2_5_TOKEN_STORE',
    stage: 2.5,
    client_configured: Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET),
    callback_url:
      env.X_OAUTH_CALLBACK_URL ||
      'https://gcc-opportunity-herald.onrender.com/x/callback',
    scopes,
    expected_username_configured: Boolean(env.X_EXPECTED_USERNAME),
    setup_enabled: /^(1|true|yes)$/i.test(env.X_OAUTH_SETUP_ENABLED || ''),
    token_store_enabled: tokenStoreEnabled,
    token_store_configured: tokenStoreConfigured,
    token_persistence_enabled: tokenStoreEnabled && tokenStoreConfigured,
    posting_enabled: false,
    note:
      'Stage 2.5 can authorize, verify and persist encrypted OAuth tokens, but contains no X post-creation path.',
  };
}

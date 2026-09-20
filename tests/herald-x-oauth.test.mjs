import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildAuthorizationUrl,
  createPkcePair,
  normalizeScopes,
  publicOAuthStatus,
  X_AUTHORIZE_URL,
  X_ME_URL,
  X_TOKEN_URL,
} from '../scripts/herald-x-oauth.mjs';

const source = fs.readFileSync(
  new URL('../scripts/herald-x-oauth.mjs', import.meta.url),
  'utf8'
);

test('X Stage 2.5 uses Authorization Code plus PKCE with bounded scopes', () => {
  const { verifier, challenge } = createPkcePair();
  assert.ok(verifier.length >= 43);
  assert.ok(challenge.length >= 43);

  const scopes = normalizeScopes('');
  assert.deepEqual(scopes, [
    'tweet.read',
    'tweet.write',
    'users.read',
    'offline.access',
  ]);

  const url = new URL(buildAuthorizationUrl({
    clientId: 'client-id',
    redirectUri: 'https://example.com/x/callback',
    state: 'state-value',
    challenge,
    scopes,
  }));

  assert.equal(url.origin + url.pathname, X_AUTHORIZE_URL);
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('client_id'), 'client-id');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://example.com/x/callback');
  assert.equal(url.searchParams.get('state'), 'state-value');
  assert.equal(url.searchParams.get('code_challenge'), challenge);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('scope'), scopes.join(' '));
});

test('X Stage 2.5 can verify identity but cannot create posts', () => {
  assert.equal(X_TOKEN_URL, 'https://api.x.com/2/oauth2/token');
  assert.equal(X_ME_URL, 'https://api.x.com/2/users/me');

  assert.doesNotMatch(source, /\/2\/tweets/);
  assert.doesNotMatch(source, /create.*tweet/i);
  assert.doesNotMatch(source, /create.*post/i);
  assert.match(source, /token_persistence_enabled:/);
  assert.match(source, /posting_enabled:\s*false/);
});

test('X Stage 2.5 public status never exposes secrets', () => {
  const status = publicOAuthStatus({
    X_CLIENT_ID: 'client-id',
    X_CLIENT_SECRET: 'super-secret',
    X_EXPECTED_USERNAME: '@GoldCondorHerald',
    X_OAUTH_SETUP_ENABLED: 'true',
    X_TOKEN_STORE_ENABLED: 'true',
    X_TOKEN_VAULT_URL: 'https://vault.example.test/token',
    X_TOKEN_VAULT_SECRET: 'vault-secret',
    X_TOKEN_ENCRYPTION_KEY: 'encryption-key',
  });

  assert.equal(status.stage, 2.5);
  assert.equal(status.client_configured, true);
  assert.equal(status.expected_username_configured, true);
  assert.equal(status.setup_enabled, true);
  assert.equal(status.token_store_enabled, true);
  assert.equal(status.token_store_configured, true);
  assert.equal(status.token_persistence_enabled, true);
  assert.equal(status.posting_enabled, false);

  const serialized = JSON.stringify(status);
  assert.doesNotMatch(serialized, /super-secret/);
  assert.doesNotMatch(serialized, /vault-secret/);
  assert.doesNotMatch(serialized, /encryption-key/);
  assert.doesNotMatch(serialized, /GoldCondorHerald/);
});

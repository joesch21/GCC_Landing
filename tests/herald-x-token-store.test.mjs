import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  decryptTokenBundle,
  encryptTokenBundle,
  loadTokenBundle,
  persistTokenBundle,
  tokenStoreConfig,
  tokenStoreStatus,
} from '../scripts/herald-x-token-store.mjs';

const KEY = Buffer.alloc(32, 7).toString('base64');
const ENV = {
  X_TOKEN_STORE_ENABLED: 'true',
  X_TOKEN_VAULT_URL: 'https://vault.example.test/v1/goldcondor-herald/oauth-token',
  X_TOKEN_VAULT_SECRET: 'vault-secret',
  X_TOKEN_ENCRYPTION_KEY: KEY,
};

const TOKEN = {
  access_token: 'access-value',
  refresh_token: 'refresh-value',
  token_type: 'bearer',
  expires_in: 7200,
  scope: 'tweet.write users.read tweet.read offline.access',
};

const ACCOUNT = {
  id: '1791548644149121024',
  username: 'RealDiogenesNOW',
};

test('Stage 2.5 encrypts OAuth token material with AES-256-GCM', () => {
  const blob = encryptTokenBundle({ token: TOKEN, account: ACCOUNT }, ENV);
  assert.doesNotMatch(blob, /access-value|refresh-value|RealDiogenesNOW/);

  const bundle = decryptTokenBundle(blob, ENV);
  assert.equal(bundle.token.access_token, TOKEN.access_token);
  assert.equal(bundle.token.refresh_token, TOKEN.refresh_token);
  assert.equal(bundle.account.id, ACCOUNT.id);
  assert.equal(bundle.account.username, ACCOUNT.username);
});

test('Stage 2.5 rejects token blobs under a different encryption key', () => {
  const blob = encryptTokenBundle({ token: TOKEN, account: ACCOUNT }, ENV);
  const wrong = {
    ...ENV,
    X_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString('base64'),
  };
  assert.throws(() => decryptTokenBundle(blob, wrong), /X_TOKEN_BLOB_DECRYPT_FAILED/);
});

test('Stage 2.5 persists only ciphertext to the remote vault', async () => {
  let request;
  const fetchImpl = async (url, options = {}) => {
    request = { url, options };
    return new Response(
      JSON.stringify({
        ok: true,
        persistence: 'render-persistent-disk',
        account: ACCOUNT,
        updatedAt: '2026-09-21T00:00:00.000Z',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await persistTokenBundle({
    token: TOKEN,
    account: ACCOUNT,
    env: ENV,
    fetchImpl,
  });

  assert.equal(result.persisted, true);
  assert.equal(request.url, ENV.X_TOKEN_VAULT_URL);
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.headers.Authorization, 'Bearer vault-secret');

  const body = JSON.parse(request.options.body);
  assert.equal(body.version, 1);
  assert.equal(body.account.username, ACCOUNT.username);
  assert.doesNotMatch(JSON.stringify(body), /access-value|refresh-value/);
  assert.equal(
    decryptTokenBundle(body.blob, ENV).token.refresh_token,
    TOKEN.refresh_token
  );
});

test('Stage 2.5 reloads and verifies the persisted account', async () => {
  const blob = encryptTokenBundle({ token: TOKEN, account: ACCOUNT }, ENV);
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        version: 1,
        blob,
        account: ACCOUNT,
        updatedAt: '2026-09-21T00:00:00.000Z',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const loaded = await loadTokenBundle({ env: ENV, fetchImpl });
  assert.equal(loaded.bundle.account.username, ACCOUNT.username);
  assert.equal(loaded.bundle.token.refresh_token, TOKEN.refresh_token);
});

test('Stage 2.5 status exposes no vault or encryption secrets', async () => {
  const config = tokenStoreConfig(ENV);
  assert.equal(config.enabled, true);
  assert.equal(config.configured, true);
  const serializedConfig = JSON.stringify(config);
  assert.equal(serializedConfig.includes('vault-secret'), false);
  assert.equal(serializedConfig.includes(KEY), false);

  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        persistence: 'render-persistent-disk',
        present: true,
        account: ACCOUNT,
        updatedAt: '2026-09-21T00:00:00.000Z',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const status = await tokenStoreStatus({ env: ENV, fetchImpl });
  assert.equal(status.reachable, true);
  assert.equal(status.token_present, true);
  assert.equal(status.account.username, ACCOUNT.username);
});

test('Stage 2.5 token-store module contains no X posting endpoint', () => {
  const source = fs.readFileSync(
    new URL('../scripts/herald-x-token-store.mjs', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(source, /\/2\/tweets/);
  assert.doesNotMatch(source, /api\.x\.com/);
});

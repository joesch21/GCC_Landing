import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chatTokenStoreConfig,
  decryptChatTokenBundle,
  encryptChatTokenBundle,
  loadChatTokenBundle,
  persistChatTokenBundle,
} from '../scripts/herald-x-chat-token-store.mjs';
import {
  decryptTokenBundle,
  encryptTokenBundle,
} from '../scripts/herald-x-token-store.mjs';

const KEY = Buffer.alloc(32, 7).toString('base64');
const ENV = {
  X_CHAT_TOKEN_STORE_ENABLED: 'true',
  X_CHAT_TOKEN_VAULT_URL:
    'https://vault.example.test/v1/goldcondor-herald/chat-oauth-token',
  X_TOKEN_VAULT_SECRET: 'vault-secret',
  X_TOKEN_ENCRYPTION_KEY: KEY,
};
const PUBLIC_ENV = {
  X_TOKEN_STORE_ENABLED: 'true',
  X_TOKEN_VAULT_URL:
    'https://vault.example.test/v1/goldcondor-herald/oauth-token',
  X_TOKEN_VAULT_SECRET: 'vault-secret',
  X_TOKEN_ENCRYPTION_KEY: KEY,
};

const TOKEN = {
  access_token: 'chat-access',
  refresh_token: 'chat-refresh',
  token_type: 'bearer',
  expires_in: 7200,
  scope: 'tweet.read users.read dm.read dm.write offline.access',
};
const ACCOUNT = {
  id: '2100000000000000000',
  username: 'GCCGoldCondor',
};

test('Chat token store derives a domain-separated encryption key by default', () => {
  const chatBlob = encryptChatTokenBundle(
    { token: TOKEN, account: ACCOUNT },
    ENV
  );
  assert.equal(
    decryptChatTokenBundle(chatBlob, ENV).token.refresh_token,
    'chat-refresh'
  );

  assert.throws(
    () => decryptTokenBundle(chatBlob, PUBLIC_ENV),
    /X_TOKEN_BLOB_INVALID|X_TOKEN_BLOB_DECRYPT_FAILED/
  );

  const publicBlob = encryptTokenBundle(
    {
      token: TOKEN,
      account: { id: ACCOUNT.id, username: 'RealDiogenesNOW' },
    },
    PUBLIC_ENV
  );
  assert.throws(
    () => decryptChatTokenBundle(publicBlob, ENV),
    /X_CHAT_TOKEN_BLOB_INVALID|X_CHAT_TOKEN_BLOB_DECRYPT_FAILED/
  );
});

test('Chat token store sends only ciphertext to its separate vault', async () => {
  let request;
  const fetchImpl = async (url, options = {}) => {
    request = { url, options };
    return new Response(
      JSON.stringify({
        ok: true,
        persistence: 'render-persistent-disk',
        account: ACCOUNT,
        updatedAt: '2026-09-21T01:00:00.000Z',
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await persistChatTokenBundle({
    token: TOKEN,
    account: ACCOUNT,
    env: ENV,
    fetchImpl,
  });
  assert.equal(result.persisted, true);
  assert.equal(request.url, ENV.X_CHAT_TOKEN_VAULT_URL);
  assert.equal(request.options.headers.Authorization, 'Bearer vault-secret');
  assert.doesNotMatch(
    request.options.body,
    /chat-access|chat-refresh/
  );
});

test('Chat token store reloads the pinned account independently', async () => {
  const blob = encryptChatTokenBundle({ token: TOKEN, account: ACCOUNT }, ENV);
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        ok: true,
        version: 1,
        blob,
        account: ACCOUNT,
        updatedAt: '2026-09-21T01:00:00.000Z',
        persistence: 'render-persistent-disk',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const loaded = await loadChatTokenBundle({ env: ENV, fetchImpl });
  assert.equal(loaded.bundle.account.username, 'GCCGoldCondor');
  assert.equal(loaded.bundle.token.access_token, 'chat-access');
});

test('Chat token store public config exposes no secret material', () => {
  const status = chatTokenStoreConfig(ENV);
  assert.equal(status.enabled, true);
  assert.equal(status.configured, true);
  assert.equal(status.encryption_mode, 'derived');
  const serialized = JSON.stringify(status);
  assert.doesNotMatch(serialized, /vault-secret/);
  assert.doesNotMatch(serialized, new RegExp(KEY));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chatOAuthConfig,
  normalizeChatOAuthScopes,
  publicChatOAuthStatus,
} from '../scripts/herald-x-chat-oauth.mjs';

const KEY = Buffer.alloc(32, 4).toString('base64');

test('X Chat Stage 1C defaults to user-context DM scopes', () => {
  assert.deepEqual(normalizeChatOAuthScopes(''), [
    'tweet.read',
    'users.read',
    'dm.read',
    'dm.write',
    'offline.access',
  ]);
});

test('X Chat Stage 1C can reuse the existing OAuth client while pinning a distinct identity', () => {
  const env = {
    X_CLIENT_ID: 'existing-client',
    X_CLIENT_SECRET: 'existing-secret',
    X_OAUTH_CALLBACK_URL: 'https://example.com/x/callback',
    X_CHAT_EXPECTED_USERNAME: '@GCCGoldCondor',
    X_CHAT_OAUTH_SETUP_ENABLED: 'false',
    X_CHAT_TOKEN_STORE_ENABLED: 'true',
    X_CHAT_TOKEN_VAULT_URL:
      'https://vault.example.test/v1/goldcondor-herald/chat-oauth-token',
    X_TOKEN_VAULT_SECRET: 'vault-secret',
    X_TOKEN_ENCRYPTION_KEY: KEY,
  };

  const config = chatOAuthConfig(env);
  assert.equal(config.clientId, 'existing-client');
  assert.equal(config.clientSecret, 'existing-secret');
  assert.equal(config.redirectUri, 'https://example.com/x/callback');
  assert.equal(config.expectedUsername, 'GCCGoldCondor');

  const status = publicChatOAuthStatus(env);
  assert.equal(status.identity_mode, 'oauth2-user-context');
  assert.equal(status.client_configured, true);
  assert.equal(status.expected_username_configured, true);
  assert.equal(status.setup_enabled, false);
  assert.equal(status.token_persistence_enabled, true);
  assert.equal(status.inbox_read_enabled, false);
  assert.equal(status.reply_enabled, false);

  const serialized = JSON.stringify(status);
  assert.doesNotMatch(serialized, /existing-secret|vault-secret|GCCGoldCondor/);
});

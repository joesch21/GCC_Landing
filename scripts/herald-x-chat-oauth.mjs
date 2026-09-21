import { normalizeScopes } from './herald-x-oauth.mjs';
import { chatTokenStoreConfig } from './herald-x-chat-token-store.mjs';

export const DEFAULT_X_CHAT_OAUTH_SCOPES = [
  'tweet.read',
  'users.read',
  'dm.read',
  'dm.write',
  'offline.access',
];

function flag(value) {
  return /^(1|true|yes)$/i.test(String(value || ''));
}

export function normalizeChatOAuthScopes(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return [...DEFAULT_X_CHAT_OAUTH_SCOPES];
  return normalizeScopes(raw);
}

export function chatOAuthConfig(env = process.env) {
  const clientId = String(
    env.X_CHAT_CLIENT_ID || env.X_CLIENT_ID || ''
  ).trim();
  const clientSecret = String(
    env.X_CHAT_CLIENT_SECRET || env.X_CLIENT_SECRET || ''
  ).trim();
  const redirectUri = String(
    env.X_CHAT_OAUTH_CALLBACK_URL ||
      env.X_OAUTH_CALLBACK_URL ||
      'https://gcc-opportunity-herald.onrender.com/x/callback'
  ).trim();
  const expectedUsername = String(
    env.X_CHAT_EXPECTED_USERNAME || ''
  ).replace(/^@/, '').trim();

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: normalizeChatOAuthScopes(env.X_CHAT_OAUTH_SCOPES || ''),
    expectedUsername,
    setupEnabled: flag(env.X_CHAT_OAUTH_SETUP_ENABLED),
  };
}

export function publicChatOAuthStatus(env = process.env) {
  const config = chatOAuthConfig(env);
  const tokenStore = chatTokenStoreConfig(env);
  return {
    status: 'X_CHAT_USER_OAUTH_STAGE_1C',
    stage: '1C',
    identity_mode: 'oauth2-user-context',
    client_configured: Boolean(config.clientId && config.clientSecret),
    callback_url: config.redirectUri,
    scopes: config.scopes,
    expected_username_configured: Boolean(config.expectedUsername),
    setup_enabled: config.setupEnabled,
    token_store_enabled: tokenStore.enabled,
    token_store_configured: tokenStore.configured,
    token_persistence_enabled: tokenStore.enabled && tokenStore.configured,
    inbox_read_enabled: false,
    reply_enabled: false,
    note:
      'Stage 1C authorizes and durably stores the dedicated X Chat user-context token. It does not read or send X Chat messages.',
  };
}

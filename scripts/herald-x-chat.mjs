const X_ME_URL = 'https://api.x.com/2/users/me?user.fields=id,name,username';

function flag(value) {
  return /^(1|true|yes)$/i.test(String(value || ''));
}

function normalizeUsername(value) {
  return String(value || '').replace(/^@/, '').trim();
}

export function chatBotConfig(env = process.env) {
  const tokenConfigured = Boolean(String(env.X_CHAT_BOT_TOKEN || '').trim());
  const expectedId = String(env.X_CHAT_BOT_EXPECTED_ID || '').trim();
  const expectedUsername = normalizeUsername(env.X_CHAT_BOT_EXPECTED_USERNAME);

  return {
    stage: 'X_CHAT_STAGE_1A',
    enabled: flag(env.X_CHAT_BOT_ENABLED),
    token_configured: tokenConfigured,
    expected_id_configured: Boolean(expectedId),
    expected_username_configured: Boolean(expectedUsername),
    read_enabled: flag(env.X_CHAT_BOT_READ_ENABLED),
    reply_enabled: flag(env.X_CHAT_BOT_REPLY_ENABLED),
    setup_enabled: flag(env.X_CHAT_BOT_SETUP_ENABLED),
    media_enabled: false,
    broadcast_enabled: false,
    unsolicited_dm_enabled: false,
  };
}

export function assertChatBotSafeGates(env = process.env) {
  const config = chatBotConfig(env);
  if (config.reply_enabled && !config.read_enabled) {
    throw new Error('X_CHAT_REPLY_REQUIRES_READ');
  }
  if (config.reply_enabled && !config.enabled) {
    throw new Error('X_CHAT_REPLY_REQUIRES_BOT_ENABLED');
  }
  return config;
}

export async function getChatBotIdentity({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const config = assertChatBotSafeGates(env);
  if (!config.enabled) {
    throw Object.assign(new Error('X_CHAT_BOT_DISABLED'), { status: 403 });
  }

  const token = String(env.X_CHAT_BOT_TOKEN || '').trim();
  if (!token) {
    throw Object.assign(new Error('X_CHAT_BOT_TOKEN_MISSING'), { status: 503 });
  }

  const response = await fetchImpl(X_ME_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'goldcondorherald-x-chat/1.0',
    },
    signal: AbortSignal.timeout(10000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = Object.assign(new Error('X_CHAT_IDENTITY_UPSTREAM_ERROR'), {
      status: response.status,
      upstream: body,
    });
    throw error;
  }

  const account = {
    id: String(body?.data?.id || ''),
    username: String(body?.data?.username || ''),
    name: String(body?.data?.name || ''),
  };

  if (!/^\d{1,32}$/.test(account.id)) {
    throw new Error('X_CHAT_IDENTITY_ID_INVALID');
  }
  if (!/^[A-Za-z0-9_]{1,15}$/.test(account.username)) {
    throw new Error('X_CHAT_IDENTITY_USERNAME_INVALID');
  }

  const expectedId = String(env.X_CHAT_BOT_EXPECTED_ID || '').trim();
  const expectedUsername = normalizeUsername(env.X_CHAT_BOT_EXPECTED_USERNAME);

  if (expectedId && account.id !== expectedId) {
    throw Object.assign(new Error('X_CHAT_IDENTITY_MISMATCH'), { status: 403 });
  }
  if (
    expectedUsername &&
    account.username.toLowerCase() !== expectedUsername.toLowerCase()
  ) {
    throw Object.assign(new Error('X_CHAT_IDENTITY_MISMATCH'), { status: 403 });
  }

  return account;
}

export function publicChatBotStatus(env = process.env) {
  const config = assertChatBotSafeGates(env);
  return {
    ...config,
    identity_verified: false,
    account: null,
    note:
      'Stage 1A verifies the dedicated X Chat bot identity only. Inbox reads, decryption and replies remain separately gated.',
  };
}

export { X_ME_URL };

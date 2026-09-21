export const X_BOTS_URL = 'https://api.x.com/2/bots';

function flag(value) {
  return /^(1|true|yes)$/i.test(String(value || ''));
}

function normalizeUsername(value) {
  return String(value || '').replace(/^@/, '').trim();
}

export function chatBotConfig(env = process.env) {
  const botTokenConfigured = Boolean(
    String(env.X_CHAT_BOT_TOKEN || '').trim()
  );
  const appBearerConfigured = Boolean(
    String(env.X_CHAT_APP_BEARER_TOKEN || '').trim()
  );
  const expectedId = String(env.X_CHAT_BOT_EXPECTED_ID || '').trim();
  const expectedUsername = normalizeUsername(
    env.X_CHAT_BOT_EXPECTED_USERNAME
  );

  return {
    stage: 'X_CHAT_STAGE_1B',
    enabled: flag(env.X_CHAT_BOT_ENABLED),
    bot_token_configured: botTokenConfigured,
    app_bearer_configured: appBearerConfigured,
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

export async function discoverChatBots({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const config = assertChatBotSafeGates(env);
  if (!config.setup_enabled) {
    throw Object.assign(new Error('X_CHAT_BOT_SETUP_DISABLED'), {
      status: 403,
    });
  }

  const appBearer = String(env.X_CHAT_APP_BEARER_TOKEN || '').trim();
  if (!appBearer) {
    throw Object.assign(new Error('X_CHAT_APP_BEARER_TOKEN_MISSING'), {
      status: 503,
    });
  }

  const response = await fetchImpl(X_BOTS_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${appBearer}`,
      Accept: 'application/json',
      'User-Agent': 'goldcondorherald-x-chat/1.1',
    },
    signal: AbortSignal.timeout(10000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error('X_CHAT_BOTS_UPSTREAM_ERROR'), {
      status: response.status,
      upstream: body,
    });
  }

  const candidates =
    Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.bots)
        ? body.bots
        : Array.isArray(body?.data?.bots)
          ? body.data.bots
          : body?.data && typeof body.data === 'object'
            ? [body.data]
            : [];

  const bots = candidates
    .map((bot) => ({
      id: String(bot?.id || bot?.user_id || ''),
      username: String(
        bot?.username || bot?.handle || bot?.screen_name || ''
      ).replace(/^@/, ''),
      name: String(bot?.name || bot?.display_name || ''),
    }))
    .filter(
      (bot) =>
        /^\d{1,32}$/.test(bot.id) &&
        /^[A-Za-z0-9_]{1,15}$/.test(bot.username)
    );

  if (bots.length === 0) {
    throw Object.assign(new Error('X_CHAT_BOT_DISCOVERY_EMPTY'), {
      status: 502,
    });
  }

  return bots;
}

export function selectExpectedChatBot(bots, env = process.env) {
  const expectedId = String(env.X_CHAT_BOT_EXPECTED_ID || '').trim();
  const expectedUsername = normalizeUsername(
    env.X_CHAT_BOT_EXPECTED_USERNAME
  );

  if (expectedId) {
    const found = bots.find((bot) => bot.id === expectedId);
    if (!found) throw new Error('X_CHAT_EXPECTED_BOT_NOT_FOUND');
    return found;
  }

  if (expectedUsername) {
    const found = bots.find(
      (bot) => bot.username.toLowerCase() === expectedUsername.toLowerCase()
    );
    if (!found) throw new Error('X_CHAT_EXPECTED_BOT_NOT_FOUND');
    return found;
  }

  if (bots.length !== 1) {
    throw Object.assign(new Error('X_CHAT_BOT_DISCOVERY_AMBIGUOUS'), {
      status: 409,
    });
  }

  return bots[0];
}

export function publicChatBotStatus(env = process.env) {
  const config = assertChatBotSafeGates(env);
  return {
    ...config,
    identity_verified: false,
    account: null,
    note:
      'Stage 1B discovers and pins the dedicated X Chat bot identity using the app bearer. Inbox reads, decryption and replies remain separately gated.',
  };
}

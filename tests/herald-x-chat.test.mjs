import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertChatBotSafeGates,
  chatBotConfig,
  discoverChatBots,
  publicChatBotStatus,
  selectExpectedChatBot,
  X_BOTS_URL,
} from '../scripts/herald-x-chat.mjs';

const BASE_ENV = {
  X_CHAT_BOT_ENABLED: 'false',
  X_CHAT_BOT_TOKEN: 'xcbot_test_secret',
  X_CHAT_APP_BEARER_TOKEN: 'app_bearer_secret',
  X_CHAT_BOT_READ_ENABLED: 'false',
  X_CHAT_BOT_REPLY_ENABLED: 'false',
  X_CHAT_BOT_SETUP_ENABLED: 'true',
};

test('Chat Stage 1B exposes only non-secret configuration state', () => {
  const status = publicChatBotStatus(BASE_ENV);
  assert.equal(status.stage, 'X_CHAT_STAGE_1B');
  assert.equal(status.enabled, false);
  assert.equal(status.bot_token_configured, true);
  assert.equal(status.app_bearer_configured, true);
  assert.equal(status.read_enabled, false);
  assert.equal(status.reply_enabled, false);
  assert.equal(status.setup_enabled, true);
  assert.equal(status.media_enabled, false);
  assert.equal(status.broadcast_enabled, false);
  assert.equal(status.unsolicited_dm_enabled, false);
  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('xcbot_test_secret'), false);
  assert.equal(serialized.includes('app_bearer_secret'), false);
});

test('Chat reply gate cannot be enabled without read and bot gates', () => {
  assert.throws(
    () =>
      assertChatBotSafeGates({
        ...BASE_ENV,
        X_CHAT_BOT_ENABLED: 'false',
        X_CHAT_BOT_READ_ENABLED: 'false',
        X_CHAT_BOT_REPLY_ENABLED: 'true',
      }),
    /X_CHAT_REPLY_REQUIRES_READ|X_CHAT_REPLY_REQUIRES_BOT_ENABLED/,
  );

  assert.throws(
    () =>
      assertChatBotSafeGates({
        ...BASE_ENV,
        X_CHAT_BOT_ENABLED: 'true',
        X_CHAT_BOT_READ_ENABLED: 'false',
        X_CHAT_BOT_REPLY_ENABLED: 'true',
      }),
    /X_CHAT_REPLY_REQUIRES_READ/,
  );
});

test('Chat Stage 1B discovers bots using the app bearer on GET /2/bots', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({
        data: [
          {
            id: '2100000000000000000',
            username: 'GoldCondorBot',
            name: 'Gold Condor Agent Desk',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const bots = await discoverChatBots({
    env: BASE_ENV,
    fetchImpl,
  });

  assert.equal(request.url, X_BOTS_URL);
  assert.equal(request.options.method, 'GET');
  assert.equal(
    request.options.headers.Authorization,
    'Bearer app_bearer_secret',
  );
  assert.deepEqual(bots, [
    {
      id: '2100000000000000000',
      username: 'GoldCondorBot',
      name: 'Gold Condor Agent Desk',
    },
  ]);
});

test('Chat Stage 1B tolerates supported bot response envelopes', async () => {
  const variants = [
    {
      data: {
        id: '2100000000000000000',
        handle: '@GoldCondorBot',
        display_name: 'Gold Condor Agent Desk',
      },
    },
    {
      bots: [
        {
          user_id: '2100000000000000000',
          screen_name: 'GoldCondorBot',
          name: 'Gold Condor Agent Desk',
        },
      ],
    },
    {
      data: {
        bots: [
          {
            id: '2100000000000000000',
            username: 'GoldCondorBot',
            name: 'Gold Condor Agent Desk',
          },
        ],
      },
    },
  ];

  for (const body of variants) {
    const bots = await discoverChatBots({
      env: BASE_ENV,
      fetchImpl: async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    });
    assert.equal(bots[0].id, '2100000000000000000');
    assert.equal(bots[0].username, 'GoldCondorBot');
  }
});

test('Chat Stage 1B selection pins expected bot or requires uniqueness', () => {
  const bots = [
    {
      id: '2100000000000000000',
      username: 'GoldCondorBot',
      name: 'Gold Condor Agent Desk',
    },
    {
      id: '2200000000000000000',
      username: 'OtherBot',
      name: 'Other Bot',
    },
  ];

  assert.equal(
    selectExpectedChatBot(bots, {
      X_CHAT_BOT_EXPECTED_USERNAME: '@GoldCondorBot',
    }).id,
    '2100000000000000000',
  );
  assert.equal(
    selectExpectedChatBot(bots, {
      X_CHAT_BOT_EXPECTED_ID: '2200000000000000000',
    }).username,
    'OtherBot',
  );

  assert.throws(
    () => selectExpectedChatBot(bots, {}),
    /X_CHAT_BOT_DISCOVERY_AMBIGUOUS/,
  );
});

test('Chat Stage 1B setup fails closed before network access when disabled', async () => {
  let called = false;
  await assert.rejects(
    discoverChatBots({
      env: {
        ...BASE_ENV,
        X_CHAT_BOT_SETUP_ENABLED: 'false',
      },
      fetchImpl: async () => {
        called = true;
        throw new Error('must not call network');
      },
    }),
    /X_CHAT_BOT_SETUP_DISABLED/,
  );
  assert.equal(called, false);
});

test('Chat Stage 1B still has no DM read/write implementation', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(
    new URL('../scripts/herald-x-chat.mjs', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /\/2\/chat\/conversations/);
  assert.doesNotMatch(source, /direct_messages/);
  assert.doesNotMatch(source, /sendMessage|createDm|dm\.write/);
});

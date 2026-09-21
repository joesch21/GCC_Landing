import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertChatBotSafeGates,
  chatBotConfig,
  getChatBotIdentity,
  publicChatBotStatus,
  X_ME_URL,
} from '../scripts/herald-x-chat.mjs';

const BASE_ENV = {
  X_CHAT_BOT_ENABLED: 'true',
  X_CHAT_BOT_TOKEN: 'xcbot_test_secret',
  X_CHAT_BOT_READ_ENABLED: 'false',
  X_CHAT_BOT_REPLY_ENABLED: 'false',
  X_CHAT_BOT_SETUP_ENABLED: 'false',
};

test('Chat Stage 1A exposes only non-secret configuration state', () => {
  const status = publicChatBotStatus(BASE_ENV);
  assert.equal(status.stage, 'X_CHAT_STAGE_1A');
  assert.equal(status.enabled, true);
  assert.equal(status.token_configured, true);
  assert.equal(status.read_enabled, false);
  assert.equal(status.reply_enabled, false);
  assert.equal(status.setup_enabled, false);
  assert.equal(status.media_enabled, false);
  assert.equal(status.broadcast_enabled, false);
  assert.equal(status.unsolicited_dm_enabled, false);
  assert.equal(JSON.stringify(status).includes('xcbot_test_secret'), false);
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
        X_CHAT_BOT_READ_ENABLED: 'false',
        X_CHAT_BOT_REPLY_ENABLED: 'true',
      }),
    /X_CHAT_REPLY_REQUIRES_READ/,
  );
});

test('Chat identity probe uses bearer token only against /2/users/me', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return new Response(
      JSON.stringify({
        data: {
          id: '2100000000000000000',
          username: 'GoldCondorBot',
          name: 'Gold Condor Agent Desk',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const account = await getChatBotIdentity({
    env: BASE_ENV,
    fetchImpl,
  });

  assert.equal(request.url, X_ME_URL);
  assert.equal(request.options.method, 'GET');
  assert.equal(
    request.options.headers.Authorization,
    'Bearer xcbot_test_secret',
  );
  assert.deepEqual(account, {
    id: '2100000000000000000',
    username: 'GoldCondorBot',
    name: 'Gold Condor Agent Desk',
  });
});

test('Chat identity probe pins expected id and username when configured', async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        data: {
          id: '2100000000000000000',
          username: 'GoldCondorBot',
          name: 'Gold Condor Agent Desk',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  const env = {
    ...BASE_ENV,
    X_CHAT_BOT_EXPECTED_ID: '2100000000000000000',
    X_CHAT_BOT_EXPECTED_USERNAME: '@GoldCondorBot',
  };

  const ok = await getChatBotIdentity({ env, fetchImpl });
  assert.equal(ok.username, 'GoldCondorBot');

  await assert.rejects(
    getChatBotIdentity({
      env: {
        ...env,
        X_CHAT_BOT_EXPECTED_USERNAME: 'OtherBot',
      },
      fetchImpl,
    }),
    /X_CHAT_IDENTITY_MISMATCH/,
  );
});

test('Chat identity probe fails closed while bot capability is disabled', async () => {
  let called = false;
  await assert.rejects(
    getChatBotIdentity({
      env: {
        ...BASE_ENV,
        X_CHAT_BOT_ENABLED: 'false',
      },
      fetchImpl: async () => {
        called = true;
        throw new Error('must not call network');
      },
    }),
    /X_CHAT_BOT_DISABLED/,
  );
  assert.equal(called, false);
});

test('Chat Stage 1A has no DM read/write endpoint implementation', async () => {
  const fs = await import('node:fs');
  const source = fs.readFileSync(
    new URL('../scripts/herald-x-chat.mjs', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(source, /\/2\/chat\/conversations/);
  assert.doesNotMatch(source, /direct_messages/);
  assert.doesNotMatch(source, /sendMessage|createDm|dm\.write/);
});

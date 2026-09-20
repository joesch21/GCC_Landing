import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertApprovalOperator,
  canonicalDraft,
  createApprovalToken,
  createXPost,
  executeApprovedDraft,
  stage3Config,
  verifyApprovalToken,
  X_CREATE_POST_URL,
} from '../scripts/herald-x-stage3.mjs';
import { encryptTokenBundle } from '../scripts/herald-x-token-store.mjs';
import {
  X_ME_URL,
  X_TOKEN_URL,
} from '../scripts/herald-x-oauth.mjs';

const KEY = Buffer.alloc(32, 5).toString('base64');
const APPROVAL_KEY = Buffer.alloc(32, 8).toString('base64');
const VAULT_URL = 'https://vault.example.test/v1/goldcondor-herald/oauth-token';
const AUDIT_URL = 'https://vault.example.test/v1/goldcondor-herald/x-audit';

const ENV = {
  X_CLIENT_ID: 'client-id',
  X_CLIENT_SECRET: 'client-secret',
  X_EXPECTED_USERNAME: 'RealDiogenesNOW',
  X_TOKEN_STORE_ENABLED: 'true',
  X_TOKEN_VAULT_URL: VAULT_URL,
  X_TOKEN_VAULT_SECRET: 'vault-secret',
  X_TOKEN_ENCRYPTION_KEY: KEY,
  X_WRITE_AUDIT_URL: AUDIT_URL,
  X_APPROVAL_SIGNING_KEY: APPROVAL_KEY,
  X_APPROVAL_OPERATOR_SECRET: 'operator-secret',
  X_APPROVAL_ISSUE_ENABLED: 'true',
  X_POSTING_ENABLED: 'true',
};

const ACCOUNT = {
  id: '1791548644149121024',
  username: 'RealDiogenesNOW',
};

const INITIAL_TOKEN = {
  access_token: 'old-access',
  refresh_token: 'old-refresh',
  token_type: 'bearer',
  expires_in: 7200,
  scope: 'tweet.write users.read tweet.read offline.access',
};

test('Stage 3 approval is explicit, short-lived, draft-bound and tamper-evident', () => {
  const draft = canonicalDraft();
  const approval = createApprovalToken({
    draftHash: draft.draft_hash,
    ttlSec: 300,
    env: ENV,
    nowMs: 1_800_000_000_000,
    randomBytesImpl: (size) => Buffer.alloc(size, 3),
  });

  const verified = verifyApprovalToken(approval.token, {
    expectedDraftHash: draft.draft_hash,
    env: ENV,
    nowMs: 1_800_000_100_000,
  });
  assert.equal(verified.draft_hash, draft.draft_hash);
  assert.equal(verified.approval_id, approval.approval_id);

  assert.throws(
    () =>
      verifyApprovalToken(approval.token + 'x', {
        expectedDraftHash: draft.draft_hash,
        env: ENV,
        nowMs: 1_800_000_100_000,
      }),
    /X_APPROVAL_TOKEN_INVALID/,
  );

  assert.throws(
    () =>
      verifyApprovalToken(approval.token, {
        expectedDraftHash: draft.draft_hash,
        env: ENV,
        nowMs: 1_800_000_400_000,
      }),
    /X_APPROVAL_TOKEN_EXPIRED_OR_INVALID/,
  );
});

test('Stage 3 approval issuance requires the operator bearer secret', () => {
  assert.doesNotThrow(() =>
    assertApprovalOperator('Bearer operator-secret', ENV),
  );
  assert.throws(
    () => assertApprovalOperator('Bearer wrong', ENV),
    /X_APPROVAL_OPERATOR_UNAUTHORIZED/,
  );
});

test('Stage 3 create post uses only POST /2/tweets and bounded reply payload', async () => {
  let captured;
  const fetchImpl = async (url, options) => {
    captured = { url, options };
    return new Response(
      JSON.stringify({ data: { id: '1234567890123456789', text: 'ok' } }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const out = await createXPost({
    accessToken: 'access',
    text: 'reply text',
    replyTo: '1111111111111111111',
    fetchImpl,
  });

  assert.equal(out.id, '1234567890123456789');
  assert.equal(captured.url, X_CREATE_POST_URL);
  assert.equal(captured.options.method, 'POST');
  assert.equal(captured.options.headers.Authorization, 'Bearer access');
  assert.deepEqual(JSON.parse(captured.options.body), {
    text: 'reply text',
    reply: { in_reply_to_tweet_id: '1111111111111111111' },
  });
});

test('Stage 3 executes exactly the approved deterministic two-post thread and audits it', async () => {
  const draft = canonicalDraft();
  const approval = createApprovalToken({
    draftHash: draft.draft_hash,
    ttlSec: 300,
    env: ENV,
  });

  let vaultBlob = encryptTokenBundle(
    { token: INITIAL_TOKEN, account: ACCOUNT },
    ENV,
  );
  const auditRecords = [];
  const xBodies = [];
  let xCreateCount = 0;

  const fetchImpl = async (url, options = {}) => {
    const method = options.method || 'GET';

    if (url === VAULT_URL && method === 'GET') {
      return new Response(
        JSON.stringify({
          ok: true,
          version: 1,
          blob: vaultBlob,
          account: ACCOUNT,
          updatedAt: '2026-09-21T00:00:00.000Z',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url === VAULT_URL && method === 'POST') {
      const body = JSON.parse(options.body);
      vaultBlob = body.blob;
      return new Response(
        JSON.stringify({
          ok: true,
          persistence: 'render-persistent-disk',
          account: ACCOUNT,
          updatedAt: '2026-09-21T00:01:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url === X_TOKEN_URL && method === 'POST') {
      return new Response(
        JSON.stringify({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          token_type: 'bearer',
          expires_in: 7200,
          scope: 'tweet.write users.read tweet.read offline.access',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url === X_ME_URL && method === 'GET') {
      return new Response(
        JSON.stringify({
          data: { ...ACCOUNT, name: 'GoldCondorHerald' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (String(url).startsWith(AUDIT_URL + '?') && method === 'GET') {
      return new Response(
        JSON.stringify({ ok: true, records: auditRecords }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url === AUDIT_URL && method === 'POST') {
      const body = JSON.parse(options.body);
      auditRecords.push(body);
      return new Response(
        JSON.stringify({
          ok: true,
          sequence: auditRecords.length,
          hash: 'a'.repeat(64),
          recordedAt: '2026-09-21T00:02:00.000Z',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (url === X_CREATE_POST_URL && method === 'POST') {
      xCreateCount += 1;
      const body = JSON.parse(options.body);
      xBodies.push(body);
      return new Response(
        JSON.stringify({
          data: {
            id:
              xCreateCount === 1
                ? '1111111111111111111'
                : '2222222222222222222',
            text: body.text,
          },
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      );
    }

    throw new Error(`unexpected fetch ${method} ${url}`);
  };

  const result = await executeApprovedDraft({
    approvalToken: approval.token,
    env: ENV,
    fetchImpl,
  });

  assert.equal(result.status, 'X_STAGE3_POSTED');
  assert.deepEqual(result.x_post_ids, [
    '1111111111111111111',
    '2222222222222222222',
  ]);
  assert.equal(xCreateCount, 2);
  assert.equal(xBodies[0].text, draft.posts[0].text);
  assert.deepEqual(xBodies[1], {
    text: draft.posts[1].text,
    reply: { in_reply_to_tweet_id: '1111111111111111111' },
  });
  assert.deepEqual(
    auditRecords.map((record) => record.status),
    ['started', 'partial', 'complete'],
  );
  assert.deepEqual(auditRecords.at(-1).xPostIds, [
    '1111111111111111111',
    '2222222222222222222',
  ]);

  const replay = await executeApprovedDraft({
    approvalToken: approval.token,
    env: ENV,
    fetchImpl,
  });
  assert.equal(replay.status, 'X_STAGE3_ALREADY_COMPLETE');
  assert.deepEqual(replay.x_post_ids, [
    '1111111111111111111',
    '2222222222222222222',
  ]);
  assert.equal(xCreateCount, 2);
});

test('Stage 3 fails closed before any network access when posting is disabled', async () => {
  const env = { ...ENV, X_POSTING_ENABLED: 'false' };
  const draft = canonicalDraft();
  const approval = createApprovalToken({
    draftHash: draft.draft_hash,
    env,
  });
  let called = false;
  await assert.rejects(
    executeApprovedDraft({
      approvalToken: approval.token,
      env,
      fetchImpl: async () => {
        called = true;
        throw new Error('network must not be reached');
      },
    }),
    /X_POSTING_DISABLED/,
  );
  assert.equal(called, false);
});

test('Stage 3 status keeps unrelated X capabilities disabled', () => {
  const status = stage3Config({
    ...ENV,
    X_POSTING_ENABLED: 'false',
    X_APPROVAL_ISSUE_ENABLED: 'false',
  });
  assert.equal(status.stage, 3);
  assert.equal(status.posting_enabled, false);
  assert.equal(status.approval_issue_enabled, false);
  assert.equal(status.allowed_capability, 'deterministic_thread_only');
  assert.equal(status.autonomous_replies_enabled, false);
  assert.equal(status.direct_messages_enabled, false);
  assert.equal(status.follows_enabled, false);
  assert.equal(status.likes_enabled, false);
  assert.equal(status.scheduled_x_posting_enabled, false);

  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes('operator-secret'), false);
  assert.equal(serialized.includes(APPROVAL_KEY), false);
});

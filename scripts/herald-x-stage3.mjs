import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { buildXDraft } from './herald-x.mjs';
import {
  loadTokenBundle,
  persistTokenBundle,
} from './herald-x-token-store.mjs';
import {
  getAuthenticatedUser,
  safeEqualText,
  X_TOKEN_URL,
} from './herald-x-oauth.mjs';

export const X_CREATE_POST_URL = 'https://api.x.com/2/tweets';
const DEFAULT_AUDIT_URL =
  'https://stack-b-attestor-backend.onrender.com/v1/goldcondor-herald/x-audit';
const MAX_APPROVAL_TTL_SEC = 600;
const DEFAULT_APPROVAL_TTL_SEC = 300;
const MAX_POST_LENGTH = 280;

function bool(value) {
  return /^(1|true|yes)$/i.test(String(value || ''));
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hmacKey(env = process.env) {
  const raw = String(env.X_APPROVAL_SIGNING_KEY || '');
  if (!raw) throw new Error('X_APPROVAL_SIGNING_KEY_MISSING');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('X_APPROVAL_SIGNING_KEY_INVALID');
  return key;
}

function operatorSecret(env = process.env) {
  return String(env.X_APPROVAL_OPERATOR_SECRET || '');
}

function safeSecretEqual(left, right) {
  const a = createHash('sha256').update(String(left)).digest();
  const b = createHash('sha256').update(String(right)).digest();
  return timingSafeEqual(a, b);
}

export function stage3Config(env = process.env) {
  let signingKeyConfigured = false;
  try {
    signingKeyConfigured = hmacKey(env).length === 32;
  } catch {
    signingKeyConfigured = false;
  }
  const approvalOperatorConfigured = Boolean(operatorSecret(env));
  const auditUrl = String(env.X_WRITE_AUDIT_URL || DEFAULT_AUDIT_URL).trim();
  const auditSecretConfigured = Boolean(env.X_TOKEN_VAULT_SECRET);
  return {
    stage: 3,
    posting_enabled: bool(env.X_POSTING_ENABLED),
    approval_issue_enabled: bool(env.X_APPROVAL_ISSUE_ENABLED),
    signing_key_configured: signingKeyConfigured,
    approval_operator_configured: approvalOperatorConfigured,
    audit_configured: Boolean(auditUrl && auditSecretConfigured),
    token_store_enabled: bool(env.X_TOKEN_STORE_ENABLED),
    allowed_capability: 'deterministic_thread_only',
    max_posts_per_operation: 2,
    autonomous_replies_enabled: false,
    direct_messages_enabled: false,
    follows_enabled: false,
    likes_enabled: false,
    scheduled_x_posting_enabled: false,
  };
}

export function canonicalDraft() {
  const draft = buildXDraft();
  const posts = draft.posts.map((post) => ({
    sequence: post.sequence,
    kind: post.kind,
    reply_to: post.reply_to || null,
    text: post.text,
  }));
  for (const post of posts) {
    if (!post.text || post.text.length > MAX_POST_LENGTH) {
      throw new Error('X_STAGE3_DRAFT_INVALID');
    }
  }
  if (posts.length !== 2 || posts[1].reply_to !== 'POST_1') {
    throw new Error('X_STAGE3_DRAFT_SHAPE_INVALID');
  }
  const canonical = {
    campaign: draft.campaign,
    posts,
  };
  return {
    ...canonical,
    draft_hash: sha256(JSON.stringify(canonical)),
  };
}

export function assertApprovalOperator(authHeader, env = process.env) {
  const expected = operatorSecret(env);
  const supplied = String(authHeader || '').startsWith('Bearer ')
    ? String(authHeader).slice('Bearer '.length).trim()
    : '';
  if (!expected || !supplied || !safeSecretEqual(expected, supplied)) {
    throw Object.assign(new Error('X_APPROVAL_OPERATOR_UNAUTHORIZED'), {
      status: 401,
    });
  }
}

export function createApprovalToken({
  draftHash,
  ttlSec = DEFAULT_APPROVAL_TTL_SEC,
  env = process.env,
  nowMs = Date.now(),
  randomBytesImpl = randomBytes,
}) {
  const config = stage3Config(env);
  if (!config.approval_issue_enabled) {
    throw Object.assign(new Error('X_APPROVAL_ISSUE_DISABLED'), { status: 403 });
  }
  if (!config.signing_key_configured) {
    throw Object.assign(new Error('X_APPROVAL_SIGNING_NOT_CONFIGURED'), {
      status: 503,
    });
  }
  if (!/^[a-f0-9]{64}$/.test(String(draftHash))) {
    throw new Error('X_APPROVAL_DRAFT_HASH_INVALID');
  }

  const boundedTtl = Math.max(
    30,
    Math.min(MAX_APPROVAL_TTL_SEC, Number(ttlSec) || DEFAULT_APPROVAL_TTL_SEC),
  );
  const issuedAt = Math.floor(nowMs / 1000);
  const payload = {
    v: 1,
    approval_id: base64url(randomBytesImpl(18)),
    operation_id: base64url(randomBytesImpl(18)),
    draft_hash: String(draftHash),
    iat: issuedAt,
    exp: issuedAt + boundedTtl,
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', hmacKey(env))
    .update(encoded)
    .digest('base64url');
  return {
    token: `v1.${encoded}.${signature}`,
    ...payload,
  };
}

export function verifyApprovalToken(
  token,
  { expectedDraftHash, env = process.env, nowMs = Date.now() } = {},
) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    throw Object.assign(new Error('X_APPROVAL_TOKEN_INVALID'), { status: 400 });
  }
  const [, encoded, suppliedSignature] = parts;
  const expectedSignature = createHmac('sha256', hmacKey(env))
    .update(encoded)
    .digest('base64url');
  if (!safeSecretEqual(expectedSignature, suppliedSignature)) {
    throw Object.assign(new Error('X_APPROVAL_TOKEN_INVALID'), { status: 400 });
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw Object.assign(new Error('X_APPROVAL_TOKEN_INVALID'), { status: 400 });
  }

  const now = Math.floor(nowMs / 1000);
  if (
    payload?.v !== 1 ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(String(payload.approval_id || '')) ||
    !/^[A-Za-z0-9_-]{16,128}$/.test(String(payload.operation_id || '')) ||
    !/^[a-f0-9]{64}$/.test(String(payload.draft_hash || '')) ||
    !Number.isInteger(payload.iat) ||
    !Number.isInteger(payload.exp) ||
    payload.exp <= now ||
    payload.iat > now + 30 ||
    payload.exp - payload.iat > MAX_APPROVAL_TTL_SEC
  ) {
    throw Object.assign(new Error('X_APPROVAL_TOKEN_EXPIRED_OR_INVALID'), {
      status: 400,
    });
  }
  if (
    expectedDraftHash &&
    !safeEqualText(payload.draft_hash, expectedDraftHash)
  ) {
    throw Object.assign(new Error('X_APPROVAL_DRAFT_MISMATCH'), { status: 409 });
  }
  return payload;
}

async function readJson(response, errorCode) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(errorCode);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function refreshUserToken({
  clientId,
  clientSecret,
  refreshToken,
  fetchImpl = fetch,
}) {
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('X_REFRESH_INPUT_MISSING');
  }
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetchImpl(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'User-Agent': 'goldcondorherald-x-stage3/3.0',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(10000),
  });
  return readJson(response, 'X_REFRESH_UPSTREAM_ERROR');
}

export async function createXPost({
  accessToken,
  text,
  replyTo = null,
  fetchImpl = fetch,
}) {
  if (!accessToken) throw new Error('X_ACCESS_TOKEN_MISSING');
  if (!text || String(text).length > MAX_POST_LENGTH) {
    throw new Error('X_POST_TEXT_INVALID');
  }
  if (replyTo !== null && !/^\d{1,32}$/.test(String(replyTo))) {
    throw new Error('X_REPLY_TARGET_INVALID');
  }
  const payload = {
    text: String(text),
    ...(replyTo
      ? { reply: { in_reply_to_tweet_id: String(replyTo) } }
      : {}),
  };
  const response = await fetchImpl(X_CREATE_POST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'goldcondorherald-x-stage3/3.0',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  const body = await readJson(response, 'X_CREATE_POST_UPSTREAM_ERROR');
  const id = String(body?.data?.id || '');
  if (!/^\d{1,32}$/.test(id)) {
    throw new Error('X_CREATE_POST_RESPONSE_INVALID');
  }
  return { id, body };
}

function auditHeaders(env) {
  const secret = String(env.X_TOKEN_VAULT_SECRET || '');
  if (!secret) throw new Error('X_WRITE_AUDIT_SECRET_MISSING');
  return {
    Authorization: `Bearer ${secret}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'goldcondorherald-x-stage3/3.0',
  };
}

function auditUrl(env) {
  return String(env.X_WRITE_AUDIT_URL || DEFAULT_AUDIT_URL).trim();
}

export async function getOperationAudit({
  operationId,
  env = process.env,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(
    `${auditUrl(env)}?operation_id=${encodeURIComponent(operationId)}`,
    {
      headers: auditHeaders(env),
      signal: AbortSignal.timeout(10000),
    },
  );
  const body = await readJson(response, 'X_WRITE_AUDIT_UPSTREAM_ERROR');
  return Array.isArray(body?.records) ? body.records : [];
}

export async function appendOperationAudit({
  input,
  env = process.env,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(auditUrl(env), {
    method: 'POST',
    headers: auditHeaders(env),
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(10000),
  });
  return readJson(response, 'X_WRITE_AUDIT_UPSTREAM_ERROR');
}

function cleanErrorCode(error) {
  const value = String(error?.message || 'X_STAGE3_FAILED')
    .toUpperCase()
    .replace(/[^A-Z0-9_:-]+/g, '_')
    .slice(0, 120);
  return value || 'X_STAGE3_FAILED';
}

async function auditedState({
  approval,
  draft,
  account,
  env,
  fetchImpl,
}) {
  const records = await getOperationAudit({
    operationId: approval.operation_id,
    env,
    fetchImpl,
  });
  for (const record of records) {
    if (
      record.approvalId !== approval.approval_id ||
      record.draftHash !== draft.draft_hash ||
      record.accountId !== account.id ||
      String(record.username).toLowerCase() !==
        String(account.username).toLowerCase()
    ) {
      throw new Error('X_WRITE_AUDIT_OPERATION_CONFLICT');
    }
  }
  const complete = records.find((record) => record.status === 'complete');
  if (complete) {
    return {
      records,
      complete,
      postIds: Array.isArray(complete.xPostIds) ? complete.xPostIds : [],
    };
  }
  const withPosts = [...records]
    .reverse()
    .find((record) => Array.isArray(record.xPostIds) && record.xPostIds.length);
  return {
    records,
    complete: null,
    postIds: withPosts?.xPostIds || [],
  };
}

export async function executeApprovedDraft({
  approvalToken,
  env = process.env,
  fetchImpl = fetch,
}) {
  const config = stage3Config(env);
  if (!config.posting_enabled) {
    throw Object.assign(new Error('X_POSTING_DISABLED'), { status: 403 });
  }
  if (!config.token_store_enabled || !config.audit_configured) {
    throw Object.assign(new Error('X_STAGE3_DEPENDENCY_NOT_READY'), {
      status: 503,
    });
  }

  const draft = canonicalDraft();
  const approval = verifyApprovalToken(approvalToken, {
    expectedDraftHash: draft.draft_hash,
    env,
  });

  const stored = await loadTokenBundle({ env, fetchImpl });
  const storedAccount = stored.bundle.account;
  const expectedUsername = String(env.X_EXPECTED_USERNAME || '')
    .replace(/^@/, '')
    .trim();
  if (
    !expectedUsername ||
    !safeEqualText(
      String(storedAccount.username).toLowerCase(),
      expectedUsername.toLowerCase(),
    )
  ) {
    throw Object.assign(new Error('X_STORED_ACCOUNT_NOT_EXPECTED'), {
      status: 403,
    });
  }

  const state = await auditedState({
    approval,
    draft,
    account: storedAccount,
    env,
    fetchImpl,
  });
  if (state.complete) {
    return {
      status: 'X_STAGE3_ALREADY_COMPLETE',
      stage: 3,
      operation_id: approval.operation_id,
      approval_id: approval.approval_id,
      draft_hash: draft.draft_hash,
      x_post_ids: state.postIds,
      posting_enabled: true,
    };
  }

  const refresh = await refreshUserToken({
    clientId: env.X_CLIENT_ID,
    clientSecret: env.X_CLIENT_SECRET,
    refreshToken: stored.bundle.token.refresh_token,
    fetchImpl,
  });
  const refreshedToken = {
    ...refresh,
    refresh_token:
      refresh?.refresh_token || stored.bundle.token.refresh_token,
  };
  const scope = String(
    refreshedToken.scope || stored.bundle.token.scope || '',
  );
  if (!scope.split(/\s+/).includes('tweet.write')) {
    throw new Error('X_TWEET_WRITE_SCOPE_MISSING');
  }

  const profile = await getAuthenticatedUser({
    accessToken: refreshedToken.access_token,
    fetchImpl,
  });
  const user = profile?.data || {};
  if (
    String(user.id || '') !== String(storedAccount.id) ||
    !safeEqualText(
      String(user.username || '').toLowerCase(),
      String(storedAccount.username || '').toLowerCase(),
    )
  ) {
    throw Object.assign(new Error('X_REFRESHED_ACCOUNT_MISMATCH'), {
      status: 403,
    });
  }

  await persistTokenBundle({
    token: refreshedToken,
    account: {
      id: String(user.id),
      username: String(user.username),
    },
    env,
    fetchImpl,
  });

  const auditBase = {
    version: 1,
    operationId: approval.operation_id,
    approvalId: approval.approval_id,
    draftHash: draft.draft_hash,
    campaign: draft.campaign,
    accountId: String(user.id),
    username: String(user.username),
  };

  if (state.records.length === 0) {
    await appendOperationAudit({
      input: {
        ...auditBase,
        status: 'started',
        xPostIds: [],
        errorCode: null,
      },
      env,
      fetchImpl,
    });
  }

  let postIds = [...state.postIds];
  try {
    if (postIds.length === 0) {
      const first = await createXPost({
        accessToken: refreshedToken.access_token,
        text: draft.posts[0].text,
        fetchImpl,
      });
      postIds = [first.id];
      await appendOperationAudit({
        input: {
          ...auditBase,
          status: 'partial',
          xPostIds: postIds,
          errorCode: null,
        },
        env,
        fetchImpl,
      });
    }

    if (postIds.length === 1) {
      const second = await createXPost({
        accessToken: refreshedToken.access_token,
        text: draft.posts[1].text,
        replyTo: postIds[0],
        fetchImpl,
      });
      postIds.push(second.id);
    }

    await appendOperationAudit({
      input: {
        ...auditBase,
        status: 'complete',
        xPostIds: postIds,
        errorCode: null,
      },
      env,
      fetchImpl,
    });

    return {
      status: 'X_STAGE3_POSTED',
      stage: 3,
      operation_id: approval.operation_id,
      approval_id: approval.approval_id,
      draft_hash: draft.draft_hash,
      x_post_ids: postIds,
      account: {
        id: String(user.id),
        username: String(user.username),
      },
      posting_enabled: true,
    };
  } catch (error) {
    await appendOperationAudit({
      input: {
        ...auditBase,
        status: 'failed',
        xPostIds: postIds,
        errorCode: cleanErrorCode(error),
      },
      env,
      fetchImpl,
    }).catch(() => undefined);
    throw error;
  }
}

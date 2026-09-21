import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';

const DEFAULT_CHAT_VAULT_URL =
  'https://stack-b-attestor-backend.onrender.com/v1/goldcondor-herald/chat-oauth-token';
const CHAT_KEY_CONTEXT = 'goldcondor-herald:x-chat-oauth:v1';

function flag(value) {
  return /^(1|true|yes)$/i.test(String(value || ''));
}

function rootEncryptionKey(env = process.env) {
  const raw = String(
    env.X_CHAT_TOKEN_ENCRYPTION_KEY || env.X_TOKEN_ENCRYPTION_KEY || ''
  );
  if (!raw) throw new Error('X_CHAT_TOKEN_ENCRYPTION_KEY_MISSING');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('X_CHAT_TOKEN_ENCRYPTION_KEY_INVALID');
  return {
    key,
    dedicated: Boolean(String(env.X_CHAT_TOKEN_ENCRYPTION_KEY || '').trim()),
  };
}

function encryptionKey(env = process.env) {
  const root = rootEncryptionKey(env);
  if (root.dedicated) return root.key;
  return createHmac('sha256', root.key)
    .update(CHAT_KEY_CONTEXT)
    .digest();
}

function vaultSecret(env = process.env) {
  return String(
    env.X_CHAT_TOKEN_VAULT_SECRET || env.X_TOKEN_VAULT_SECRET || ''
  );
}

export function chatTokenStoreConfig(env = process.env) {
  const vaultUrl = String(
    env.X_CHAT_TOKEN_VAULT_URL || DEFAULT_CHAT_VAULT_URL
  ).trim();
  const secret = vaultSecret(env);
  let keyConfigured = false;
  let encryptionMode = 'unconfigured';
  try {
    const root = rootEncryptionKey(env);
    keyConfigured = root.key.length === 32;
    encryptionMode = root.dedicated ? 'dedicated' : 'derived';
  } catch {
    keyConfigured = false;
  }

  return {
    enabled: flag(env.X_CHAT_TOKEN_STORE_ENABLED),
    vault_url_configured: Boolean(vaultUrl),
    vault_secret_configured: Boolean(secret),
    encryption_key_configured: keyConfigured,
    encryption_mode: encryptionMode,
    configured: Boolean(vaultUrl && secret && keyConfigured),
  };
}

export function encryptChatTokenBundle({ token, account }, env = process.env) {
  const key = encryptionKey(env);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  if (
    !token?.access_token ||
    !token?.refresh_token ||
    !account?.id ||
    !account?.username
  ) {
    throw new Error('X_CHAT_TOKEN_BUNDLE_INCOMPLETE');
  }

  const payload = Buffer.from(
    JSON.stringify({
      version: 1,
      purpose: 'x-chat-user-oauth',
      token: {
        access_token: String(token.access_token),
        refresh_token: String(token.refresh_token),
        token_type: token?.token_type ? String(token.token_type) : null,
        expires_in:
          Number.isFinite(Number(token?.expires_in))
            ? Number(token.expires_in)
            : null,
        scope: token?.scope ? String(token.scope) : null,
      },
      account: {
        id: String(account.id),
        username: String(account.username),
      },
      stored_at: new Date().toISOString(),
    }),
    'utf8'
  );

  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();

  const envelope = {
    version: 1,
    purpose: 'x-chat-user-oauth',
    alg: 'A256GCM',
    iv: iv.toString('base64url'),
    tag: tag.toString('base64url'),
    ciphertext: ciphertext.toString('base64url'),
  };

  return Buffer.from(JSON.stringify(envelope), 'utf8').toString('base64url');
}

export function decryptChatTokenBundle(blob, env = process.env) {
  const key = encryptionKey(env);
  let envelope;
  try {
    envelope = JSON.parse(
      Buffer.from(String(blob), 'base64url').toString('utf8')
    );
  } catch {
    throw new Error('X_CHAT_TOKEN_BLOB_INVALID');
  }

  if (
    envelope?.version !== 1 ||
    envelope?.purpose !== 'x-chat-user-oauth' ||
    envelope?.alg !== 'A256GCM' ||
    typeof envelope?.iv !== 'string' ||
    typeof envelope?.tag !== 'string' ||
    typeof envelope?.ciphertext !== 'string'
  ) {
    throw new Error('X_CHAT_TOKEN_BLOB_INVALID');
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(envelope.iv, 'base64url')
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64url')),
      decipher.final(),
    ]);
    const bundle = JSON.parse(plaintext.toString('utf8'));
    if (
      bundle?.version !== 1 ||
      bundle?.purpose !== 'x-chat-user-oauth' ||
      !bundle?.token?.access_token ||
      !bundle?.token?.refresh_token ||
      !bundle?.account?.id ||
      !bundle?.account?.username
    ) {
      throw new Error('invalid bundle');
    }
    return bundle;
  } catch {
    throw new Error('X_CHAT_TOKEN_BLOB_DECRYPT_FAILED');
  }
}

async function readJson(response) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error('X_CHAT_TOKEN_VAULT_UPSTREAM_ERROR');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function vaultHeaders(secret, includeJson = false) {
  return {
    Authorization: `Bearer ${secret}`,
    Accept: 'application/json',
    'User-Agent': 'goldcondorherald-x-chat-token-store/1.0',
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
  };
}

export async function persistChatTokenBundle({
  token,
  account,
  env = process.env,
  fetchImpl = fetch,
}) {
  const config = chatTokenStoreConfig(env);
  if (!config.enabled) throw new Error('X_CHAT_TOKEN_STORE_DISABLED');
  if (!config.configured) throw new Error('X_CHAT_TOKEN_STORE_NOT_CONFIGURED');

  const vaultUrl = String(
    env.X_CHAT_TOKEN_VAULT_URL || DEFAULT_CHAT_VAULT_URL
  ).trim();
  const secret = vaultSecret(env);
  const blob = encryptChatTokenBundle({ token, account }, env);

  const response = await fetchImpl(vaultUrl, {
    method: 'POST',
    headers: vaultHeaders(secret, true),
    body: JSON.stringify({
      version: 1,
      blob,
      account: {
        id: String(account.id),
        username: String(account.username),
      },
    }),
    signal: AbortSignal.timeout(10000),
  });

  const body = await readJson(response);
  return {
    persisted: true,
    persistence: body?.persistence || 'remote-vault',
    account: body?.account || {
      id: String(account.id),
      username: String(account.username),
    },
    updated_at: body?.updatedAt || null,
  };
}

export async function loadChatTokenBundle({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const config = chatTokenStoreConfig(env);
  if (!config.enabled) throw new Error('X_CHAT_TOKEN_STORE_DISABLED');
  if (!config.configured) throw new Error('X_CHAT_TOKEN_STORE_NOT_CONFIGURED');

  const vaultUrl = String(
    env.X_CHAT_TOKEN_VAULT_URL || DEFAULT_CHAT_VAULT_URL
  ).trim();
  const secret = vaultSecret(env);
  const response = await fetchImpl(vaultUrl, {
    headers: vaultHeaders(secret),
    signal: AbortSignal.timeout(10000),
  });
  const body = await readJson(response);
  const bundle = decryptChatTokenBundle(body?.blob, env);

  if (
    body?.account?.id &&
    String(body.account.id) !== String(bundle.account.id)
  ) {
    throw new Error('X_CHAT_TOKEN_STORE_ACCOUNT_MISMATCH');
  }
  if (
    body?.account?.username &&
    String(body.account.username).toLowerCase() !==
      String(bundle.account.username).toLowerCase()
  ) {
    throw new Error('X_CHAT_TOKEN_STORE_ACCOUNT_MISMATCH');
  }

  return {
    bundle,
    updated_at: body?.updatedAt || null,
    persistence: body?.persistence || 'render-persistent-disk',
  };
}

export async function chatTokenStoreStatus({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const config = chatTokenStoreConfig(env);
  if (!config.enabled || !config.configured) {
    return {
      ...config,
      reachable: false,
      token_present: false,
      account: null,
      updated_at: null,
    };
  }

  const vaultUrl = String(
    env.X_CHAT_TOKEN_VAULT_URL || DEFAULT_CHAT_VAULT_URL
  ).trim();
  const secret = vaultSecret(env);
  const response = await fetchImpl(`${vaultUrl}/status`, {
    headers: vaultHeaders(secret),
    signal: AbortSignal.timeout(10000),
  });
  const body = await readJson(response);

  return {
    ...config,
    reachable: true,
    token_present: Boolean(body?.present),
    account: body?.account || null,
    updated_at: body?.updatedAt || null,
    persistence: body?.persistence || 'remote-vault',
  };
}

import http from 'node:http';
import { spawn } from 'node:child_process';

const PORT = Number(process.env.PORT || 10000);
const MOLTBOOK_API_BASE =
  process.env.MOLTBOOK_API_BASE_URL || 'https://www.moltbook.com/api/v1';
const API_KEY = process.env.MOLTBOOK_API_KEY || '';
const BOOTSTRAP_TOKEN = process.env.HERALD_BOOTSTRAP_TOKEN || '';
const BOOTSTRAP_DISABLED = /^(1|true|yes)$/i.test(
  process.env.HERALD_BOOTSTRAP_DISABLED || ''
);
const AUTO_BOOTSTRAP = /^(1|true|yes)$/i.test(
  process.env.HERALD_AUTO_BOOTSTRAP || ''
);
const AGENT_NAME = process.env.HERALD_AGENT_NAME || 'GCCOpportunityHerald';
const AGENT_DESCRIPTION =
  process.env.HERALD_AGENT_DESCRIPTION ||
  'Neutral opportunity announcer for open GCC work. Publishes factual notices only; does not recruit, rank, verify, select, or settle work.';

let bootstrapResult = null;
let tickPromise = null;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
  });
  res.end(payload);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'gcc-opportunity-herald-service/1.0',
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(10000),
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function bootstrap() {
  if (API_KEY || BOOTSTRAP_DISABLED) {
    throw Object.assign(new Error('Bootstrap disabled'), { status: 409 });
  }
  if (bootstrapResult) return bootstrapResult;

  const result = await fetchJson(`${MOLTBOOK_API_BASE}/agents/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: AGENT_NAME,
      description: AGENT_DESCRIPTION,
    }),
  });

  const agent = result?.agent || result;
  if (!agent?.api_key || !agent?.claim_url) {
    const error = new Error('Moltbook registration response missing credentials');
    error.status = 502;
    error.body = result;
    throw error;
  }

  bootstrapResult = {
    api_key: String(agent.api_key),
    claim_url: String(agent.claim_url),
    verification_code: agent.verification_code
      ? String(agent.verification_code)
      : null,
    agent_name: AGENT_NAME,
  };
  return bootstrapResult;
}

async function claimStatus() {
  if (!API_KEY) {
    return { status: 'NO_API_KEY' };
  }
  return fetchJson(`${MOLTBOOK_API_BASE}/agents/status`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });
}

function runTick() {
  if (tickPromise) return tickPromise;

  tickPromise = new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/herald-moltbook.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HERALD_DRY_RUN: 'false',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        const error = new Error('Herald tick failed');
        error.code = code;
        error.stdout = stdout.trim();
        error.stderr = stderr.trim();
        reject(error);
        return;
      }
      resolve({
        status: 'TICK_COMPLETE',
        output: stdout.trim(),
      });
    });
  }).finally(() => {
    tickPromise = null;
  });

  return tickPromise;
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/', `http://${host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/health') {
      return sendJson(res, 200, {
        ok: true,
        service: 'gcc-opportunity-herald',
        configured: Boolean(API_KEY),
        bootstrap_enabled: Boolean(BOOTSTRAP_TOKEN && !BOOTSTRAP_DISABLED && !API_KEY),
      });
    }

    if (req.method === 'GET' && url.pathname === '/bootstrap') {
      if (!BOOTSTRAP_TOKEN || url.searchParams.get('token') !== BOOTSTRAP_TOKEN) {
        return sendJson(res, 404, { error: 'Not found' });
      }
      const result = await bootstrap();
      return sendJson(res, 200, result);
    }

    if (req.method === 'GET' && url.pathname === '/claim-status') {
      const result = await claimStatus();
      return sendJson(res, 200, result);
    }

    if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/tick') {
      if (!API_KEY) {
        return sendJson(res, 503, { status: 'NO_API_KEY' });
      }
      const result = await runTick();
      return sendJson(res, 200, result);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (error) {
    const status = Number(error?.status) || 500;
    console.error(
      JSON.stringify({
        event: 'HERALD_SERVICE_ERROR',
        path: url.pathname,
        status,
        message: error?.message || String(error),
      })
    );
    return sendJson(res, status, {
      error: error?.message || 'Internal error',
      upstream_status: error?.status || null,
    });
  }
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(
    JSON.stringify({
      event: 'HERALD_SERVICE_READY',
      port: PORT,
      configured: Boolean(API_KEY),
      bootstrap_enabled: Boolean(BOOTSTRAP_TOKEN && !BOOTSTRAP_DISABLED && !API_KEY),
      agent_name: AGENT_NAME,
    })
  );

  if (AUTO_BOOTSTRAP && !API_KEY && !BOOTSTRAP_DISABLED) {
    try {
      const result = await bootstrap();
      // AUTO_BOOTSTRAP is an explicitly enabled one-time operational mode.
      // Render application logs are private to the workspace. Disable this
      // mode immediately after storing the returned key as an environment
      // secret.
      console.log(
        JSON.stringify({
          event: 'HERALD_BOOTSTRAP_CREDENTIALS',
          ...result,
        })
      );
    } catch (error) {
      console.error(
        JSON.stringify({
          event: 'HERALD_BOOTSTRAP_FAILED',
          message: error?.message || String(error),
          upstream_status: error?.status || null,
        })
      );
    }
  }
});

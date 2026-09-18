import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const discovery = require('../public/.well-known/gcc-agent.json');
const tender = require('../public/tenders/GCC-GENESIS-001.json');
const {
  classifyClient,
  logGenesisDiscoveryRequest,
  persistGenesisDiscoveryEvent,
} = require('../api/_genesis-telemetry');
const discoveryHandler = require('../api/genesis-discovery');
const tenderHandler = require('../api/genesis-tender');

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = String(value);
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      this.ended = true;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

test('classifies known GCC probes separately from external traffic', () => {
  assert.equal(
    classifyClient({ 'user-agent': 'gcc-genesis-live-readiness/1.0', accept: 'application/json' }).clientClass,
    'internal_probe'
  );
  assert.equal(
    classifyClient({ 'user-agent': 'curl/8.5.0', accept: '*/*' }).clientClass,
    'automation_tool'
  );
  assert.equal(
    classifyClient({ 'user-agent': 'python-requests/2.32', accept: 'application/json' }).clientClass,
    'runtime_client'
  );
  assert.equal(
    classifyClient({ 'user-agent': 'Mozilla/5.0 Safari/605.1.15', accept: 'text/html' }).clientClass,
    'browser'
  );
});

test('privacy-safe telemetry excludes identifying request fields', () => {
  const messages = [];
  const originalInfo = console.info;
  console.info = (message) => messages.push(String(message));
  try {
    const event = logGenesisDiscoveryRequest(
      {
        method: 'GET',
        headers: {
          'user-agent': 'python-requests/2.32 secret-agent-label',
          accept: 'application/json',
          cookie: 'session=secret',
          referer: 'https://example.com/private',
          'x-forwarded-for': '203.0.113.99',
        },
        url: '/.well-known/gcc-agent.json?private=value',
      },
      'discovery'
    );

    assert.equal(event.event, 'GENESIS_DISCOVERY_REQUEST');
    assert.equal(event.endpoint, 'discovery');
    assert.equal(event.clientClass, 'runtime_client');

    const serialized = messages.join('\n');
    assert.doesNotMatch(serialized, /203\.0\.113\.99/);
    assert.doesNotMatch(serialized, /session=secret/);
    assert.doesNotMatch(serialized, /example\.com\/private/);
    assert.doesNotMatch(serialized, /secret-agent-label/);
    assert.doesNotMatch(serialized, /private=value/);
  } finally {
    console.info = originalInfo;
  }
});

test('discovery handler returns canonical discovery JSON', async () => {
  const originalInfo = console.info;
  console.info = () => {};
  try {
    const req = { method: 'GET', headers: { 'user-agent': 'curl/8.5.0', accept: 'application/json' } };
    const res = mockResponse();
    await discoveryHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, discovery);
    assert.match(res.headers['content-type'], /application\/json/);
    assert.match(res.headers['cache-control'], /no-store/);
  } finally {
    console.info = originalInfo;
  }
});

test('tender handler returns canonical tender JSON', async () => {
  const originalInfo = console.info;
  console.info = () => {};
  try {
    const req = { method: 'GET', headers: { 'user-agent': 'node', accept: 'application/json' } };
    const res = mockResponse();
    await tenderHandler(req, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, tender);
    assert.equal(res.body.tender_id, 'GCC-GENESIS-001');
    assert.equal(res.body.network.chain_id, 56);
  } finally {
    console.info = originalInfo;
  }
});


test('persistent forwarding is disabled outside Vercel production', async () => {
  const originalEnv = process.env.VERCEL_ENV;
  delete process.env.VERCEL_ENV;
  try {
    const result = await persistGenesisDiscoveryEvent({
      endpoint: 'discovery',
      method: 'GET',
      clientClass: 'runtime_client',
      acceptClass: 'json',
    });
    assert.deepEqual(result, { persisted: false, reason: 'NON_PRODUCTION' });
  } finally {
    if (originalEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnv;
  }
});


test('production fallback forwards only coarse telemetry when OIDC is absent', async () => {
  const originalEnv = process.env.VERCEL_ENV;
  const originalToken = process.env.VERCEL_OIDC_TOKEN;
  const originalFetch = global.fetch;
  const calls = [];

  process.env.VERCEL_ENV = 'production';
  delete process.env.VERCEL_OIDC_TOKEN;
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    return {
      ok: true,
      status: 202,
      async json() {
        return { ok: true, authMode: 'indicative_header' };
      },
    };
  };

  try {
    const result = await persistGenesisDiscoveryEvent({
      endpoint: 'discovery',
      method: 'GET',
      clientClass: 'runtime_client',
      acceptClass: 'json',
      ignored: 'must-not-be-forwarded',
    });

    assert.equal(result.persisted, true);
    assert.equal(result.authMode, 'indicative_header');
    assert.equal(calls.length, 1);

    const headers = calls[0].options.headers;
    assert.equal(headers['User-Agent'], 'gcc-genesis-telemetry-forwarder/1.0');
    assert.equal(headers['X-GCC-Telemetry-Version'], '1');
    assert.equal(headers['X-GCC-Telemetry-Source'], 'goldcondor.info');
    assert.equal(headers.Authorization, undefined);

    assert.deepEqual(JSON.parse(calls[0].options.body), {
      endpoint: 'discovery',
      method: 'GET',
      clientClass: 'runtime_client',
      acceptClass: 'json',
    });
  } finally {
    global.fetch = originalFetch;
    if (originalEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalEnv;
    if (originalToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
    else process.env.VERCEL_OIDC_TOKEN = originalToken;
  }
});

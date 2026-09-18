const GENESIS_STATS_SINK_URL =
  process.env.GCC_GENESIS_STATS_SINK_URL ||
  'https://stack-b-attestor-backend.onrender.com/v1/gcc-genesis/telemetry';

function classifyClient(headers = {}) {
  const ua = String(headers['user-agent'] || headers['User-Agent'] || '').toLowerCase();
  const accept = String(headers.accept || headers.Accept || '').toLowerCase();

  if (
    ua.startsWith('gcc-genesis-public-readiness/') ||
    ua.startsWith('gcc-genesis-live-readiness/')
  ) {
    return { clientClass: 'internal_probe', acceptClass: classifyAccept(accept) };
  }

  if (/bot|spider|crawler|crawl|slurp|bingpreview/.test(ua)) {
    return { clientClass: 'crawler', acceptClass: classifyAccept(accept) };
  }

  if (/curl|wget|httpie|postman/.test(ua)) {
    return { clientClass: 'automation_tool', acceptClass: classifyAccept(accept) };
  }

  if (/node|python|go-http-client|java|okhttp|rust|reqwest/.test(ua)) {
    return { clientClass: 'runtime_client', acceptClass: classifyAccept(accept) };
  }

  if (/mozilla\/5\.0|chrome|safari|firefox|edg\//.test(ua)) {
    return { clientClass: 'browser', acceptClass: classifyAccept(accept) };
  }

  return { clientClass: ua ? 'unknown_client' : 'no_user_agent', acceptClass: classifyAccept(accept) };
}

function classifyAccept(value) {
  if (!value || value === '*/*') return 'any';
  if (value.includes('application/json')) return 'json';
  if (value.includes('text/html')) return 'html';
  return 'other';
}

function logGenesisDiscoveryRequest(req, endpoint) {
  const { clientClass, acceptClass } = classifyClient(req.headers || {});
  const event = {
    event: 'GENESIS_DISCOVERY_REQUEST',
    timestamp: new Date().toISOString(),
    endpoint,
    method: String(req.method || 'GET').toUpperCase(),
    clientClass,
    acceptClass,
  };

  // Deliberately do not log IP address, cookies, wallet address, query strings,
  // referrer, or the raw User-Agent. The purpose is aggregate experiment
  // telemetry, not visitor identification.
  console.info(JSON.stringify(event));
  return event;
}

function isProductionTelemetryContext(context = {}) {
  const host = String(context.host || '')
    .split(':')[0]
    .trim()
    .toLowerCase();

  return (
    process.env.VERCEL_ENV === 'production' ||
    host === 'goldcondor.info' ||
    host === 'www.goldcondor.info'
  );
}

async function persistGenesisDiscoveryEvent(event, context = {}) {
  if (!isProductionTelemetryContext(context)) {
    return { persisted: false, reason: 'NON_PRODUCTION' };
  }

  const token = process.env.VERCEL_OIDC_TOKEN;

  try {
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'gcc-genesis-telemetry-forwarder/1.0',
      'X-GCC-Telemetry-Version': '1',
      'X-GCC-Telemetry-Source': 'goldcondor.info',
    };
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(GENESIS_STATS_SINK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        endpoint: event.endpoint,
        method: event.method,
        clientClass: event.clientClass,
        acceptClass: event.acceptClass,
      }),
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      console.warn(JSON.stringify({
        event: 'GENESIS_DISCOVERY_PERSIST_FAILED',
        status: response.status,
      }));
      return { persisted: false, reason: 'UPSTREAM_' + response.status };
    }

    let upstream = null;
    try {
      upstream = await response.json();
    } catch {
      upstream = null;
    }
    return {
      persisted: true,
      authMode: upstream && upstream.authMode
        ? String(upstream.authMode)
        : token
          ? 'vercel_oidc'
          : 'indicative_header',
    };
  } catch (error) {
    console.warn(JSON.stringify({
      event: 'GENESIS_DISCOVERY_PERSIST_FAILED',
      reason: error && error.name ? String(error.name) : 'FETCH_FAILED',
    }));
    return { persisted: false, reason: 'FETCH_FAILED' };
  }
}

module.exports = {
  classifyClient,
  logGenesisDiscoveryRequest,
  isProductionTelemetryContext,
  persistGenesisDiscoveryEvent,
};

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

module.exports = {
  classifyClient,
  logGenesisDiscoveryRequest,
};

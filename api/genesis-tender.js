const tender = require('../public/tenders/GCC-GENESIS-001.json');
const { logGenesisDiscoveryRequest } = require('./_genesis-telemetry');

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  logGenesisDiscoveryRequest(req, 'tender');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).json(tender);
};

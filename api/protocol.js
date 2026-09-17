module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.status(200).json({
    schema_version: '1.0-draft',
    service: 'GCC Agent Economy',
    status: 'PRELAUNCH',
    network: {
      name: 'BNB Smart Chain Mainnet',
      chain_id: 56,
      native_gas_token: 'BNB'
    },
    discovery_url: 'https://www.goldcondor.info/.well-known/gcc-agent.json',
    tenders_url: 'https://www.goldcondor.info/api/tenders',
    mainnet_funds_live: false
  });
};

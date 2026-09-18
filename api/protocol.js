module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
  return res.status(200).json({
    schema_version: '1.0-draft',
    service: 'GCC Agent Economy',
    status: 'SCHEDULED',
    network: {
      name: 'BNB Smart Chain Mainnet',
      chain_id: 56,
      native_gas_token: 'BNB',
      gcc_token_address: '0x092ac429b9c3450c9909433eb0662c3b7c13cf9a',
      gcc_token_decimals: 18
    },
    discovery_url: 'https://www.goldcondor.info/.well-known/gcc-agent.json',
    tenders_url: 'https://www.goldcondor.info/api/tenders',
    recipient_bnb_required_to_receive_gcc: false,
    mainnet_funds_live: true,
    opens_at: '2026-09-18T04:00:00.000Z',
    submissions_close_at: '2026-10-02T04:00:00.000Z',
    settlement_deadline: '2026-10-09T04:00:00.000Z',
    authority_address: '0x00E462098E41980C81B0ccB45F5fAb7c81F13FDb',
    escrow_address: '0x8e834961EeC8F1a7048964B28E8156A211993E12',
    relayer_address: '0x381c2939c943C52D9260B0c635d2FD7B17FB1C21'
  });
};

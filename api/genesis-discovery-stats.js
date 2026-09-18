const STATS_URL =
  process.env.GCC_GENESIS_STATS_URL ||
  'https://stack-b-attestor-backend.onrender.com/v1/gcc-genesis/stats';

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstream = await fetch(STATS_URL, {
      method: req.method,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'gcc-genesis-stats-proxy/1.0',
      },
      signal: AbortSignal.timeout(3000),
    });

    if (!upstream.ok) {
      return res.status(502).json({
        ok: false,
        error: 'Genesis discovery stats unavailable',
      });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    if (req.method === 'HEAD') return res.status(200).end();
    return res.status(200).json(await upstream.json());
  } catch {
    return res.status(502).json({
      ok: false,
      error: 'Genesis discovery stats unavailable',
    });
  }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== 'https:') return false;
    return hostname === 'goldcondor.info'
      || hostname === 'www.goldcondor.info'
      || hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isAllowedOrigin(req.headers.origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const body = typeof req.body === 'string'
    ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })()
    : (req.body || {});

  // Honeypot: return success without forwarding bot submissions.
  if (String(body.company || '').trim()) {
    return res.status(202).json({ ok: true });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const source = String(body.source || 'merch').trim().slice(0, 80);

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const webhookUrl = process.env.MERCH_WAITLIST_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(503).json({
      error: 'Waitlist setup is finishing. Please check back soon.'
    });
  }

  let url;
  try {
    url = new URL(webhookUrl);
  } catch {
    return res.status(503).json({ error: 'Waitlist is temporarily unavailable.' });
  }

  if (url.protocol !== 'https:') {
    return res.status(503).json({ error: 'Waitlist is temporarily unavailable.' });
  }

  const headers = { 'Content-Type': 'application/json' };
  if (process.env.MERCH_WAITLIST_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.MERCH_WAITLIST_WEBHOOK_TOKEN}`;
  }

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        source,
        createdAt: new Date().toISOString()
      })
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: 'Waitlist is temporarily unavailable.' });
    }

    return res.status(202).json({ ok: true });
  } catch {
    return res.status(502).json({ error: 'Waitlist is temporarily unavailable.' });
  }
};

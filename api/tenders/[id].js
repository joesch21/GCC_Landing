const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const id = String(req.query && req.query.id ? req.query.id : '');
  if (!/^[A-Z0-9-]+$/.test(id)) {
    return res.status(400).json({ error: 'Invalid tender id' });
  }

  const allowed = new Set(['GCC-GENESIS-001']);
  if (!allowed.has(id)) {
    return res.status(404).json({ error: 'Tender not found' });
  }

  try {
    const tenderPath = path.join(process.cwd(), 'public', 'tenders', `${id}.json`);
    const tender = JSON.parse(fs.readFileSync(tenderPath, 'utf8'));
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).json(tender);
  } catch (error) {
    console.error('Unable to read GCC tender:', error);
    return res.status(500).json({ error: 'Unable to read tender' });
  }
};

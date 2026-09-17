const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const discoveryPath = path.join(
      process.cwd(),
      'public',
      '.well-known',
      'gcc-agent.json'
    );
    const discovery = JSON.parse(fs.readFileSync(discoveryPath, 'utf8'));
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).json({
      schema_version: discovery.schema_version,
      status: discovery.status,
      tenders: discovery.tenders || []
    });
  } catch (error) {
    console.error('Unable to read GCC tender discovery document:', error);
    return res.status(500).json({ error: 'Unable to read GCC tender catalog' });
  }
};

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const winningNFTFilePath = path.join(__dirname, 'winningNFT.json');
const merchWaitlist = require('./api/merch-waitlist');
const genesisDiscovery = require('./api/genesis-discovery');
const genesisTender = require('./api/genesis-tender');
const opportunitiesOpen = require('./api/opportunities/open');

// Instrument canonical Genesis machine endpoints before static-file handling.
app.all('/.well-known/gcc-agent.json', genesisDiscovery);
app.all('/tenders/GCC-GENESIS-001.json', genesisTender);
app.all('/api/opportunities/open', opportunitiesOpen);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Keep the local server in parity with the Vercel merch waitlist function.
app.all('/api/merch-waitlist', merchWaitlist);

// API endpoint to get the winning NFT
app.get('/api/winning-nft', (req, res) => {
  fs.readFile(winningNFTFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading winning NFT data:', err);
      return res.status(500).json({ error: 'Unable to read winning NFT data' });
    }
    try {
      const winningNFT = JSON.parse(data);
      res.json(winningNFT);
    } catch (parseErr) {
      console.error('Error parsing winning NFT data:', parseErr);
      return res.status(500).json({ error: 'Invalid winning NFT data' });
    }
  });
});

// API endpoint to generate and save a new winning NFT
app.post('/api/winning-nft', (req, res) => {
  const winningNFT = { winningNFT: Math.floor(Math.random() * 54) };
  fs.writeFile(winningNFTFilePath, JSON.stringify(winningNFT), (err) => {
    if (err) {
      console.error('Error saving winning NFT data:', err);
      return res.status(500).json({ error: 'Unable to save winning NFT data' });
    }
    res.json(winningNFT);
  });
});

// Serve named pages before the homepage fallback. Both merch URL forms are
// supported locally because Express does not automatically normalize a
// trailing slash the way the deployed site does.
app.get(['/about', '/agents', '/grants', '/network', '/merch', '/merch/'], (req, res) => {
  const route = req.path === '/merch/' ? '/merch' : req.path;
  const page = {
    '/about': 'about.html',
    '/agents': 'agents.html',
    '/grants': 'grants.html',
    '/network': 'opportunity.html',
    '/merch': 'merch.html'
  }[route];
  res.sendFile(path.join(__dirname, 'public', page));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

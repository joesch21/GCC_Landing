const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const winningNFTFilePath = path.join(__dirname, 'winningNFT.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Serve the main index.html for any other routes
app.get(['/about', '/agents', '/network'], (req, res) => {
  const page = { '/about': 'about.html', '/agents': 'agents.html', '/network': 'opportunity.html' }[req.path];
  res.sendFile(path.join(__dirname, 'public', page));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

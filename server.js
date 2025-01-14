const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const winningNFTFilePath = path.join(__dirname, 'winningNFT.json');

// API endpoint to get the winning NFT
app.get('/api/winning-nft', (req, res) => {
  fs.readFile(winningNFTFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading winning NFT data:', err);
      return res.status(500).json({ error: 'Unable to read winning NFT data' });
    }
    const winningNFT = JSON.parse(data);
    res.json(winningNFT);
  });
});

// API endpoint to generate and save a new winning NFT
app.post('/api/winning-nft', (req, res) => {
  const winningNFT = { winningNFT: Math.floor(Math.random() * 54) }; // Random number between 0 and 53
  fs.writeFile(winningNFTFilePath, JSON.stringify(winningNFT), (err) => {
    if (err) {
      console.error('Error saving winning NFT data:', err);
      return res.status(500).json({ error: 'Unable to save winning NFT data' });
    }
    res.json(winningNFT);
  });
});

// Serve the main index.html for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

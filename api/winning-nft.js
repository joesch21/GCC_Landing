const fs = require('fs');
const path = require('path');

const winningNFTFilePath = path.join(__dirname, '..', 'winningNFT.json');

module.exports = (req, res) => {
  if (req.method === 'GET') {
    fs.readFile(winningNFTFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading winning NFT data:', err);
        return res.status(500).json({ error: 'Unable to read winning NFT data' });
      }
      const winningNFT = JSON.parse(data);
      res.json(winningNFT);
    });
  } else if (req.method === 'POST') {
    const winningNFT = { winningNFT: Math.floor(Math.random() * 54) }; // Generates a random number between 0 and 53
    fs.writeFile(winningNFTFilePath, JSON.stringify(winningNFT), (err) => {
      if (err) {
        console.error('Error saving winning NFT data:', err);
        return res.status(500).json({ error: 'Unable to save winning NFT data' });
      }
      res.json(winningNFT);
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

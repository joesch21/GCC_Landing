const fetch = require('node-fetch');

async function testAPI() {
  const getUrl = 'http://localhost:3000/api/winning-nft';
  const postUrl = 'http://localhost:3000/api/winning-nft';

  // Test GET request
  try {
    const getResponse = await fetch(getUrl);
    const getData = await getResponse.json();
    console.log('GET response:', getData);
  } catch (error) {
    console.error('Error with GET request:', error);
  }

  // Test POST request
  try {
    const postResponse = await fetch(postUrl, {
      method: 'POST'
    });
    const postData = await postResponse.json();
    console.log('POST response:', postData);
  } catch (error) {
    console.error('Error with POST request:', error);
  }
}

testAPI();

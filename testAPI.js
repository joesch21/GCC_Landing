// Smoke-test the local winning-nft API (requires `npm start` first).
async function testAPI() {
  const base = process.env.API_BASE || 'http://localhost:3000';
  const getUrl = `${base}/api/winning-nft`;
  const postUrl = `${base}/api/winning-nft`;

  try {
    const getResponse = await fetch(getUrl);
    const getData = await getResponse.json();
    console.log('GET response:', getData);
  } catch (error) {
    console.error('Error with GET request:', error.message || error);
  }

  try {
    const postResponse = await fetch(postUrl, { method: 'POST' });
    const postData = await postResponse.json();
    console.log('POST response:', postData);
  } catch (error) {
    console.error('Error with POST request:', error.message || error);
  }
}

testAPI();

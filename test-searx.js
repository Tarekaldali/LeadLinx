import fetch from 'node-fetch';

async function testSearx() {
  const query = 'site:reddit.com saas';
  const url = `https://searx.be/search?q=${encodeURIComponent(query)}&format=json`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    });
    console.log('Searx Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Results:', data.results?.length);
      if (data.results?.length > 0) {
        console.log(data.results[0]);
      }
    } else {
      console.log(await res.text());
    }
  } catch (err) {
    console.error('Err:', err.message);
  }
}

testSearx();

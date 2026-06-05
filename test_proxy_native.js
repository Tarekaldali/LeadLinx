import https from 'https';
import { HttpsProxyAgent } from 'https-proxy-agent';

function httpsGet(urlStr, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(urlStr, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          ok: res.statusCode >= 200 && res.statusCode < 300,
          text: async () => data,
          json: async () => JSON.parse(data)
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function testVercelProxy() {
  const proxyUrl = 'http://czyysast:hyui5c8xxguq@38.154.203.95:5863';
  const agent = new HttpsProxyAgent(proxyUrl);
  
  try {
    const res = await httpsGet('https://www.reddit.com/search.rss?q=plumbers&sort=new', {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Length:", text.length);
  } catch (err) {
    console.error(err);
  }
}

testVercelProxy();

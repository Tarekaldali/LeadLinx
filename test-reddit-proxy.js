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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request Timeout'));
    });
    req.end();
  });
}

const proxyUrl = 'http://czyysast:hyui5c8xxguq@38.154.203.95:5863';
const agent = new HttpsProxyAgent(proxyUrl);

async function test() {
  console.log('Testing Reddit via proxy...');
  try {
    const res = await httpsGet('https://old.reddit.com/search.json?q=saas&sort=new', {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Children:', data?.data?.children?.length);
    } else {
      console.log('Error text:', await res.text());
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();

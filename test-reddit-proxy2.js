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

async function test(url, ua) {
  console.log(`\nTesting ${url} with UA: ${ua}`);
  try {
    const res = await httpsGet(url, {
      agent,
      headers: {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7'
      }
    });
    console.log('Status:', res.status);
    if (res.ok) {
      const text = await res.text();
      console.log('Success length:', text.length);
    } else {
      console.log('Error snippet:', (await res.text()).substring(0, 200));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function runTests() {
  const uas = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'web:com.leadlinx.app:v1.0.0 (by /u/LeadLinxDev)'
  ];
  const urls = [
    'https://www.reddit.com/search.json?q=saas&sort=new',
    'https://www.reddit.com/search.rss?q=saas&sort=new'
  ];

  for (const url of urls) {
    for (const ua of uas) {
      await test(url, ua);
    }
  }
}

runTests();

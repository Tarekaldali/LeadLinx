import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXIES = [
  'http://czyysast:hyui5c8xxguq@38.154.203.95:5863',
  'http://czyysast:hyui5c8xxguq@198.105.121.200:6462',
  'http://czyysast:hyui5c8xxguq@64.137.96.74:6641',
  'http://czyysast:hyui5c8xxguq@209.127.138.10:5784',
  'http://czyysast:hyui5c8xxguq@38.154.185.97:6370',
  'http://czyysast:hyui5c8xxguq@84.247.60.125:6095',
  'http://czyysast:hyui5c8xxguq@142.111.67.146:5611',
  'http://czyysast:hyui5c8xxguq@194.39.32.164:6461',
  'http://czyysast:hyui5c8xxguq@191.96.254.138:6185',
  'http://czyysast:hyui5c8xxguq@31.58.9.4:6077'
];

async function testAll() {
  for (const proxy of PROXIES) {
    const agent = new HttpsProxyAgent(proxy);
    try {
      const res = await fetch('https://old.reddit.com/search.json?q=saas&sort=new', {
        agent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        }
      });
      console.log(`Proxy ${proxy.split('@')[1]} -> Status: ${res.status}`);
    } catch (e) {
      console.log(`Proxy ${proxy.split('@')[1]} -> Error: ${e.message}`);
    }
  }
}

testAll();

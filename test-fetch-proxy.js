import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = 'http://czyysast:hyui5c8xxguq@38.154.203.95:5863';
const agent = new HttpsProxyAgent(proxyUrl);

async function testFetchProxy() {
  console.log('Testing node-fetch with proxy...');
  try {
    const res = await fetch('https://old.reddit.com/search.json?q=saas&sort=new', {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    if (res.ok) {
      const data = await res.json();
      console.log('Success!', data?.data?.children?.length);
    } else {
      console.log('Error:', (await res.text()).substring(0, 200));
    }
  } catch (err) {
    console.error('Err:', err.message);
  }
}

testFetchProxy();

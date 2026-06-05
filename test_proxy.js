import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

async function testProxy() {
  const proxyUrl = 'http://czyysast:hyui5c8xxguq@38.154.203.95:5863';
  const agent = new HttpsProxyAgent(proxyUrl);
  
  try {
    const res = await fetch('https://www.reddit.com/search.rss?q=plumbers&sort=new', {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response length:", text.length);
  } catch (err) {
    console.error("Proxy error:", err);
  }
}

testProxy();

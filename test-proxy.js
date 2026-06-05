import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxy = 'http://czyysast:hyui5c8xxguq@38.154.203.95:5863';
const agent = new HttpsProxyAgent(proxy);

async function testProxy() {
  try {
    const res = await fetch('https://html.duckduckgo.com/html/?q=test', { agent });
    console.log(res.status);
    const text = await res.text();
    console.log(text.substring(0, 200));
  } catch (err) {
    console.error(err);
  }
}
testProxy();

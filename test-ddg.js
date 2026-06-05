import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = 'http://czyysast:hyui5c8xxguq@38.154.203.95:5863';
const agent = new HttpsProxyAgent(proxyUrl);

async function testDDG(useProxy) {
  const query = '"saas" site:reddit.com';
  const url = 'https://html.duckduckgo.com/html/';
  
  const body = new URLSearchParams();
  body.append('q', query);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      body,
      agent: useProxy ? agent : undefined,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    console.log(`DDG Status (Proxy: ${useProxy}):`, res.status);
    if (!res.ok) {
      console.log('Error', await res.text());
      return;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];
    
    $('.result').each((i, el) => {
      const title = $(el).find('.result__title a').text().trim();
      const link = $(el).find('.result__url').attr('href') || $(el).find('.result__a').attr('href');
      const snippet = $(el).find('.result__snippet').text().trim();
      
      if (title) {
        results.push({ title, url: link, content: snippet });
      }
    });
    console.log('Found results:', results.length);
    if (results.length > 0) console.log(results[0]);
  } catch (err) {
    console.error('Err:', err.message);
  }
}

async function run() {
  await testDDG(false);
  await testDDG(true);
}
run();

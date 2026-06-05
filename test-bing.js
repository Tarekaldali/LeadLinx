import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = 'http://czyysast:hyui5c8xxguq@38.154.203.95:5863';
const agent = new HttpsProxyAgent(proxyUrl);

async function testBingReddit() {
  const query = '"saas" site:reddit.com';
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=20`;
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      }
    });
    console.log('Bing Status:', res.status);
    if (!res.ok) {
      console.log('Error', await res.text());
      return;
    }
    const html = await res.text();
    const fs = await import('fs');
    fs.writeFileSync('bing_dump.html', html);
    const $ = cheerio.load(html);
    console.log('Total li:', $('li').length);
    console.log('Total h2:', $('h2').length);
    const results = [];
    
    $('li.b_algo').each((i, el) => {
      const title = $(el).find('h2 a').text().trim();
      const link = $(el).find('h2 a').attr('href') || '';
      const snippet = $(el).find('.b_caption p, .b_algoSlug').text().trim();
      
      if ((title || snippet) && link) {
        results.push({ title, url: link, content: snippet });
      }
    });
    console.log('Found results:', results.length);
    console.log(results[0]);
  } catch (err) {
    console.error('Err:', err);
  }
}

testBingReddit();

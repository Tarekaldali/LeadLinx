import { extractOmniLeads } from './src/lib/omni-extractor/index.js';

async function test() {
  try {
    console.log('Testing omni-extractor...');
    const result = await extractOmniLeads('need a crm for small business', { isPremium: true });
    console.log('Stats:', result.stats);
    console.log('Leads:', result.leads.length);
    if (result.leads.length === 0) {
      console.log('Zero leads found. Why?');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

test();

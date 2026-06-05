import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { extractOmniLeads } from './src/lib/omni-extractor/index.js';

async function test() {
  try {
    console.log("OPENROUTER:", !!process.env.OPENROUTER_API_KEY);
    const data = await extractOmniLeads("I need leads for marketing agencies or small businesses looking for marketing help");
    console.log("Extracted high-intent leads:", data.leads.length);
    console.log(JSON.stringify(data.leads.slice(0, 2), null, 2));
  } catch (error) {
    console.error("Error during extraction:", error);
  }
}

test();

import { config } from 'dotenv';
config({ path: '.env.local' });

// Dynamic import so dotenv runs first
const run = async () => {
  const { extractOmniLeads } = await import('./src/lib/omni-extractor/index.js');
  try {
    console.log('Testing extraction...');
    const result = await extractOmniLeads('SaaS founders complaining about stripe', { isPremium: true });
    console.log('Result stats:', result.stats);
    console.log('Leads found:', result.leads.length);
  } catch (err) {
    console.error('Error:', err);
  }
};

run();

import { runSocialExtraction } from './src/lib/omni-extractor/sources/reddit.js';

async function test() {
  console.log("Testing Reddit extraction...");
  const leads = await runSocialExtraction({
    keywords: ["plumbers"],
    subreddits: ["smallbusiness"],
    searchIntent: "Find plumbers in London"
  });
  console.log("Found leads:", leads.length);
}

test().catch(console.error);

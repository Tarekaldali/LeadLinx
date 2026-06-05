import { validateLeadIntent } from './src/lib/omni-extractor/validator.js';

async function test() {
  const result = await validateLeadIntent(
    "Hi, I'm looking for a plumber in London to fix my sink.",
    { socials: ["reddit:@plumber_guy"] },
    "Find plumbers in London",
    false
  );
  console.log(result);
}

test().catch(console.error);

import fs from 'fs';

// Manually load env vars FIRST
const env = fs.readFileSync('.env.local', 'utf-8');
env.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    process.env[key.trim()] = value.join('=').trim();
  }
});

const mockLead = {
  title: 'Need a Lead Generation Software',
  text: 'I am looking for a SaaS product that helps with finding high-quality leads on Reddit.',
  subreddit: 'SaaS',
  url: 'https://reddit.com/r/SaaS/comments/example',
  intentScore: 9.5,
  reasoning: 'The user is explicitly looking for a Lead Generation Software, indicating high buying intent.',
};

async function test() {
  const { sendLeadAlert } = await import('./src/lib/email.js');
  console.log('Sending test email to:', process.env.EMAIL_USER);
  await sendLeadAlert(process.env.EMAIL_USER, mockLead);
  console.log('Test complete.');
}

test();

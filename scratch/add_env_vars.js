const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found!');
  process.exit(1);
}

const fileContent = fs.readFileSync(envPath, 'utf8');
const lines = fileContent.split(/\r?\n/);

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;

  const eqIdx = trimmed.indexOf('=');
  if (eqIdx <= 0) continue;

  const key = trimmed.substring(0, eqIdx).trim();
  let val = trimmed.substring(eqIdx + 1).trim();

  // Strip wrapping quotes if any
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.substring(1, val.length - 1);
  }

  if (!key || !val) {
    console.log(`Skipping empty variable: ${key}`);
    continue;
  }

  // Determine production/preview/development values
  let valToUse = val;
  if (key === 'NEXTAUTH_URL' || key === 'NEXT_PUBLIC_APP_URL') {
    valToUse = 'https://leadlinx.vercel.app';
    console.log(`Setting URL variable ${key} to ${valToUse}`);
  }

  console.log(`Uploading ${key}...`);
  for (const envType of ['production', 'preview', 'development']) {
    let currentVal = valToUse;
    if ((key === 'NEXTAUTH_URL' || key === 'NEXT_PUBLIC_APP_URL') && envType === 'development') {
      currentVal = 'http://localhost:3000';
    }

    try {
      execSync(`vercel env add ${key} ${envType} --yes --force`, {
        input: currentVal,
        encoding: 'utf8'
      });
      console.log(`  Added to ${envType}`);
    } catch (error) {
      console.error(`  Error adding ${key} to ${envType}:`, error.message);
    }
  }
}

console.log('Environment variable upload completed successfully!');

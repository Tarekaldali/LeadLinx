const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\tarek\\.gemini\\antigravity\\brain\\45fd80d2-c925-4d5d-8ec6-f4b3c8d5481f\\.system_generated\\logs\\overview.txt', 'utf8');

const match = content.match(/LeadLinx V2: Strategic Intelligence Engine Prompt.*?(?=I\. THE 12-LAYER ANALYSIS PIPELINE)/s);
if (match) {
  console.log(content.substring(match.index, match.index + 2000));
} else {
  const match2 = content.match(/I\. THE 12-LAYER ANALYSIS PIPELINE.*/s);
  if (match2) console.log(match2[0].substring(0, 2000));
  else console.log('Not found');
}

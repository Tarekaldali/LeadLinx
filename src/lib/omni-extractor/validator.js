/**
 * Omni-Extractor — LLM Intent Validation & Scoring
 * Passes raw scraped content + detected contacts to LLM for final validation.
 */

import { callGemini } from '../gemini.js';

const VALIDATOR_PROMPT = `You are a strict Data Quality Engineer for a lead generation system.
You will be provided with raw text context and a list of extracted contacts (emails, phones, socials).
You must determine if this represents a REAL person or business that matches the user's SEARCH_INTENT.

EVALUATION CRITERIA:
1. Intent Match: Does the text show they are looking for the service/product described in the intent? Or are they selling it? (We want buyers, or relevant businesses).
2. Contact Quality: Are these real contacts or fake/spam? 

OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include any markdown formatting (like \`\`\`json), no preamble, and no post-response text.

REQUIRED JSON STRUCTURE:
{
  "is_valid_lead": true | false,
  "confidence_score": 0.0 - 1.0,
  "lead_name": "Extracted name or 'Unknown'",
  "reasoning": "Brief explanation of why this is or isn't a lead",
  "verified_contacts": {
    "emails": ["list of valid emails"],
    "phones": ["list of valid phones"],
    "socials": ["list of valid social handles"]
  }
}
`;

export async function validateLeadIntent(contextText, extractedContacts, searchIntent) {
  try {
    const messages = [
      { role: 'system', content: VALIDATOR_PROMPT },
      { 
        role: 'user', 
        content: `SEARCH_INTENT: "${searchIntent}"\n\nEXTRACTED_CONTACTS: ${JSON.stringify(extractedContacts)}\n\nCONTEXT:\n${contextText.substring(0, 3000)}` 
      },
    ];

    const res = await callGemini(messages, { temperature: 0, responseFormat: 'json' });
    let text = res.text.trim();
    
    // Attempt to extract JSON if it's wrapped in markers or surrounded by text
    let parsed;
    try {
      // 1. Try direct parse
      parsed = JSON.parse(text);
    } catch (e) {
      // 2. Try cleaning markdown markers
      const cleanedText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      try {
        parsed = JSON.parse(cleanedText);
      } catch (e2) {
        // 3. Try finding first { and last }
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        
        if (start !== -1 && end !== -1 && end > start) {
          const jsonString = text.substring(start, end + 1);
          try {
            parsed = JSON.parse(jsonString);
          } catch (e3) {
            console.error('[Omni-Validator] JSON block found but invalid:', jsonString);
            throw new Error('Invalid JSON format from Validator');
          }
        } else {
          console.error('[Omni-Validator] No JSON block found in text:', text);
          throw new Error('No JSON block found from Validator');
        }
      }
    }

    return parsed;
  } catch (error) {
    console.error('[Omni-Validator] Failed to validate lead:', error);
    return {
      is_valid_lead: false,
      confidence_score: 0,
      lead_name: "Unknown",
      reasoning: "Failed to validate via LLM.",
      verified_contacts: extractedContacts
    };
  }
}

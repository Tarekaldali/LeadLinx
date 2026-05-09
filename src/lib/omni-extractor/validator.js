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

Return ONLY valid JSON:
{
  "is_valid_lead": true | false,
  "confidence_score": 0.0 - 1.0,
  "lead_name": "Extracted name or 'Unknown'",
  "reasoning": "Why this is or isn't a lead",
  "verified_contacts": {
    "emails": ["valid@email.com"],
    "phones": ["+123456"],
    "socials": ["@handle"]
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
    const text = res.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(text.substring(start, end + 1));
      } else {
        throw new Error('Invalid JSON format from Validator');
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

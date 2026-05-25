/**
 * Omni-Extractor — LLM Intent Validation & Scoring
 * Passes raw scraped content + detected contacts to LLM for final validation.
 */

import { callGemini } from '../gemini.js';

const VALIDATOR_PROMPT = `You are a Lead Quality Analyst for a lead generation system.
You will be provided with raw text context and a list of extracted contacts (emails, phones, socials).
You must determine if this represents a REAL person or business that could be a potential lead matching the user's SEARCH_INTENT.

EVALUATION CRITERIA:
1. Intent Match: Does the text show the person is in the target audience? They DON'T need to be explicitly asking to buy. Being in the right industry/niche/topic counts.
2. Value Proposition: Could a business reasonably reach out to this person?
3. Contact Quality: Reddit handles (reddit:@username) are VALID contacts. Social handles are VALID. Not every lead needs an email.

IMPORTANT RULES:
- If someone is posting in a relevant subreddit about a relevant topic, they ARE a valid lead.
- A Reddit user asking about a topic related to the search intent IS a valid lead.
- Set is_valid_lead=true if the person is in the right target audience, even without email.
- confidence_score should be 0.6+ for relevant topic discussions, 0.8+ for explicit buying intent.
- Use the Reddit username as lead_name if no other name is available.

OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include any markdown formatting (like \`\`\`json), no preamble, and no post-response text.

REQUIRED JSON STRUCTURE:
{
  "is_valid_lead": true | false,
  "confidence_score": 0.0 - 1.0,
  "lead_name": "Extracted name or Reddit username",
  "reasoning": "Brief explanation of why this is or isn't a lead",
  "verified_contacts": {
    "emails": ["list of valid emails"],
    "phones": ["list of valid phones"],
    "socials": ["list of valid social handles"]
  }
}
`;

export async function validateLeadIntent(contextText, extractedContacts, searchIntent, returnUsage = false) {
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
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const cleanedText = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
      try {
        parsed = JSON.parse(cleanedText);
      } catch (e2) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const jsonString = text.substring(start, end + 1);
          parsed = JSON.parse(jsonString);
        } else {
          throw new Error('No JSON block found');
        }
      }
    }

    if (returnUsage) {
      return {
        data: parsed,
        usage: { prompt_tokens: res.inputTokens, completion_tokens: res.outputTokens }
      };
    }

    return parsed;
  } catch (error) {
    console.error('[Omni-Validator] Failed to validate lead:', error);
    const fallback = {
      is_valid_lead: false,
      confidence_score: 0,
      lead_name: "Unknown",
      reasoning: "Failed to validate via LLM.",
      verified_contacts: extractedContacts
    };
    return returnUsage ? { data: fallback, usage: { prompt_tokens: 0, completion_tokens: 0 } } : fallback;
  }
}

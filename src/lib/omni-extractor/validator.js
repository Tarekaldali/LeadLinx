/**
 * Omni-Extractor — LLM Intent Validation & Scoring
 * Passes raw scraped content + detected contacts to LLM for final validation.
 */

import { callGemini } from '../gemini.js';

const VALIDATOR_PROMPT = `You are the "LeadLinx Lead Classifier." Your job is to find as many potential leads as possible.
You will be provided with raw text context and a list of extracted contacts (emails, phones, socials).
Determine if this represents a REAL person or business that could be a potential lead matching the user's SEARCH_INTENT.

EVALUATION CRITERIA:
1. Intent Match: Does the text show the person is in the target audience OR showing any signs of interest/need?
2. Value Proposition: Could a business reasonably reach out to pitch this person?
3. Contact Quality: Reddit handles (reddit:@username) are VALID contacts. Social handles are VALID. Not every lead needs an email.

SCORING FORMULA:
- 0.1-0.4 (IRRELEVANT): Completely off-topic, spam, bots, or deleted accounts. Set is_valid_lead=false.
- 0.5-0.6 (COOL): Tangentially related topic, user may have interest. Set is_valid_lead=true.
- 0.6-0.7 (WARM): Relevant topic, user is exploring solutions or expressing pain points. Set is_valid_lead=true.
- 0.7-0.8 (HOT LEAD): User is ACTIVELY seeking advice/alternatives for a specific problem. Set is_valid_lead=true.
- 0.9-1.0 (READY TO BUY): User is asking for direct recommendations, mentioning budget, or expressing urgency. Set is_valid_lead=true.

IMPORTANT RULES:
- Only reject (is_valid_lead=false) if the post is COMPLETELY unrelated to the topic or is spam/bot/deleted.
- If someone mentions the topic at all in a relevant context, score >= 0.5 and set is_valid_lead=true.
- If someone wants to BUY or FIND a solution related to the intent, score >= 0.7.
- Set is_valid_lead=true for ANY score >= 0.5.
- Use the Reddit username as lead_name if no other name is available.
- BE VERY GENEROUS — it is better to approve a borderline lead than to miss a real one.

LEAD TYPE CLASSIFICATION:
- "Pain-Point": User describes a problem they have
- "Competitor-Frustration": User complains about an existing solution  
- "Solution-Seeking": User asks for recommendations or tools

OUTPUT FORMAT:
Return ONLY a valid JSON object. Do not include any markdown formatting (like \`\`\`json), no preamble, and no post-response text.

REQUIRED JSON STRUCTURE:
{
  "is_valid_lead": true | false,
  "confidence_score": 0.0 - 1.0,
  "lead_name": "Extracted name or Reddit username",
  "lead_type": "Pain-Point" | "Competitor-Frustration" | "Solution-Seeking",
  "reasoning": "Brief explanation of why this is or isn't a lead (max 15 words)",
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
    if (error.message && error.message.includes('OpenRouter')) {
      throw error; // Propagate API errors to surface them to the user
    }
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

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// The credit cost per outreach generation. Keep in sync with OUTREACH_COST in OutreachWorkspace.js
const OUTREACH_CREDIT_COST = 10;

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { context, tone = 'professional', length = 'medium', platform = 'email', senderName = '' } = await request.json();

    if (!context || context.trim().length === 0) {
      return NextResponse.json({ error: 'Context is required.' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(session.user.id);

    // Check credits — must have at least OUTREACH_CREDIT_COST
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user || user.credits < OUTREACH_CREDIT_COST) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${OUTREACH_CREDIT_COST} credits to generate an outreach message.` },
        { status: 403 }
      );
    }

    // Call OpenRouter for AI generation
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OpenRouter API key is missing.' }, { status: 500 });
    }

    const systemPrompt = `You are an expert sales copywriter. Your goal is to write a highly converting, personalized outreach message based on the provided context.
Tone: ${tone}
Length: ${length}
Platform: ${platform}

Rules:
- Keep it concise and natural, adhering to the requested Length (${length === 'short' ? 'very brief, 2-3 sentences max' : length === 'long' ? 'detailed, comprehensive paragraphs' : 'standard length, 3-4 sentences'}).
${senderName ? `- The sender's name is "${senderName}". Sign off the message using this name. Do NOT generate a fake or random name.` : '- Do not include placeholders like [Your Name] unless absolutely necessary; write it ready to send.'}
- Do not sound like a robot or use generic AI phrases.
- For email, include a compelling subject line at the top starting with "Subject: ".
- For Reddit DMs, keep it friendly, respect subreddit norms, and keep it under 200 words without a subject line.
- For Twitter/X DMs, keep it under 300 characters, very punchy and direct.
- End with a clear, soft call-to-action (not a hard sell).`;

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://leadlinx.vercel.app',
        'X-Title': 'LeadLinx',
      },
      body: JSON.stringify({
        // CACHE-HIT OPTIMIZED: system prompt is static; variable context goes in user message.
        model: 'deepseek/deepseek-v4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Context about the lead:\n${context}` }
        ],
        temperature: 0.75,
      })
    });

    if (!aiRes.ok) {
      throw new Error(`OpenRouter API error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const generatedText = aiData.choices?.[0]?.message?.content || '';

    if (!generatedText) {
      throw new Error('Failed to generate content from AI.');
    }

    const { getRawCost } = await import('@/lib/creditManager.js');
    const usage = aiData.usage || { prompt_tokens: 0, completion_tokens: 0 };
    // We use default pricing since it's a generic model for this example, or deepseek's
    const rawCostUsd = getRawCost('default', usage); 

    await db.collection('ai_usage').insertOne({
      userId: userId,
      chatId: null,
      type: 'reply_generation',
      query: `Outreach Message via ${platform}`,
      totalUsage: usage,
      rawCostUsd: rawCostUsd,
      totalCostUsd: rawCostUsd * 10,
      profitUsd: rawCostUsd * 9,
      creditsCharged: OUTREACH_CREDIT_COST,
      leadsReturned: 0,
      postsAnalyzed: 0,
      plan: user?.plan || 'free',
      timestamp: new Date()
    });

    // Deduct credits
    const updateResult = await db.collection('users').findOneAndUpdate(
      { _id: userId, credits: { $gte: OUTREACH_CREDIT_COST } },
      { $inc: { credits: -OUTREACH_CREDIT_COST } },
      { returnDocument: 'after' }
    );

    if (!updateResult) {
      return NextResponse.json({ error: 'Credit deduction failed. Please try again.' }, { status: 409 });
    }

    return NextResponse.json({
      text: generatedText,
      creditsDeducted: OUTREACH_CREDIT_COST,
      creditsRemaining: updateResult.credits,
    });
  } catch (error) {
    console.error('Outreach generation error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function POST(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { chatId } = await params;
    const { query } = await request.json();
    
    if (!query) return NextResponse.json({ error: 'Query is required' }, { status: 400 });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5-nano",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates extremely concise chat titles. Based on the user's initial prompt, generate a 3-5 word concise title for the conversation. Return ONLY the title string, with no quotes, no markdown, and no extra text."
          },
          { role: "user", content: query }
        ],
      })
    });
    
    let title = 'New Chat';
    if (response.ok) {
      const data = await response.json();
      title = data.choices?.[0]?.message?.content?.replace(/['"]/g, '').trim() || query.substring(0, 45);
      if (title.length > 50) title = title.substring(0, 47) + '...';
    } else {
      title = query.substring(0, 45);
    }

    const db = await getDb();
    await db.collection('chats').updateOne(
      { _id: new ObjectId(chatId), userId: new ObjectId(authResult.user.id) },
      { $set: { title, updatedAt: new Date() } }
    );

    return NextResponse.json({ title });
  } catch (error) {
    console.error('Failed to generate title:', error);
    return NextResponse.json({ error: 'Failed to generate title' }, { status: 500 });
  }
}

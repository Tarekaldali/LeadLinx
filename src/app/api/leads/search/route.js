import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { generateSearchPlan, classifyIntent } from '@/lib/aiOrchestrator';
import { runBackgroundSearch } from '@/lib/backgroundWorker';
import { ObjectId } from 'mongodb';

export async function POST(request) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await request.json();
    const query = body.query;
    const chatId = body.chatId;

    if (!query?.trim()) {
      return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    // 1. Pre-check credits (at least 1 to start)
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user || user.credits < 1) {
      return NextResponse.json({ error: 'Insufficient credits.' }, { status: 402 });
    }

    // 2. Phase 0: Intent Gatekeeper
    // Determine if this is a lead search or just a conversation
    const classification = await classifyIntent(query);
    console.log("🎯 Intent Classification:", classification);

    if (classification.intent === "CHAT") {
      // It's just a greeting or general talk. Update chat and return immediately.
      // We still want to save it to the database so the chat history is preserved
      const aiResponse = classification.response_message || "How can I help you find leads today?";
      
      // Update the chat message in the database (assuming we want to persist the AI reply)
      // Since the frontend handles message state, we just need to return the reply
      return NextResponse.json({ 
        status: "chat", 
        message: aiResponse 
      }, { status: 200 });
    }

    // 3. Phase 1: Strategic Search Planning
    // We do this sync to give the user immediate feedback on WHAT we are scanning
    const searchPlan = await generateSearchPlan(query);
    console.log("📍 Search Plan:", searchPlan);

    // 4. Initialize Search Session in DB
    const searchSession = {
      userId,
      query,
      chatId: chatId || null,
      status: 'processing',
      searchPlan,
      leadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('searches').insertOne(searchSession);
    const searchId = result.insertedId;

    // 5. Trigger Phase 2 (Asynchronous Background Job)
    runBackgroundSearch(userId, query, searchPlan, chatId).catch(err => {
      console.error("🔥 Detached Background Job Failed:", err);
    });

    // 6. Immediate Response for SEARCH intent
    return NextResponse.json({ 
      status: "processing", 
      searchId: searchId,
      message: "Scrutinizing Reddit posts for high-intent signals...",
      plan: searchPlan
    }, { status: 200 });

  } catch (error) {
    console.error('Search initiation error:', error);
    return NextResponse.json({ error: 'Failed to initiate search.' }, { status: 500 });
  }
}

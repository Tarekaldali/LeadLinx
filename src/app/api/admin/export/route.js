import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const db = await getDb();
    
    // 1. Fetch Users
    const users = await db.collection('users').find({}).project({
      password: 0
    }).toArray();
    
    // 2. Fetch AI Usage / Chat Costs
    const aiUsage = await db.collection('ai_usage').find({}).sort({ timestamp: -1 }).limit(1000).toArray();
    
    // 3. Fetch Subscriptions / Revenue
    const subscriptions = await db.collection('subscriptions').find({}).toArray();
    
    // 4. Fetch Chat History (Monitors / Searches)
    const searches = await db.collection('searches').find({}).sort({ createdAt: -1 }).limit(1000).toArray();
    
    // 5. Fetch Chats
    const chats = await db.collection('chats').find({}).sort({ updatedAt: -1 }).limit(1000).toArray();
    
    // Format Users
    const formattedUsers = users.map(u => ({
      ID: u._id.toString(),
      Email: u.email,
      Name: u.name || 'N/A',
      Plan: u.plan || 'free',
      Credits: u.credits || 0,
      Status: u.banned ? 'Suspended' : 'Active',
      Created: u.createdAt ? new Date(u.createdAt).toLocaleString() : 'N/A'
    }));

    // Format Revenue (Subscriptions)
    const formattedRevenue = subscriptions.map(s => ({
      ID: s._id.toString(),
      UserID: s.userId?.toString() || 'N/A',
      Plan: s.plan,
      Status: s.status,
      Provider: s.provider,
      Created: s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A'
    }));
    
    // Format AI Usage & Costs
    const formattedCosts = aiUsage.map(a => ({
      ID: a._id.toString(),
      UserID: a.userId?.toString() || 'N/A',
      Type: a.type,
      Query: a.query || 'N/A',
      InputTokens: a.totalUsage?.prompt_tokens || 0,
      OutputTokens: a.totalUsage?.completion_tokens || 0,
      RawCostUSD: a.rawCostUsd || 0,
      TotalCostUSD: a.totalCostUsd || 0,
      ProfitUSD: a.profitUsd || 0,
      CreditsCharged: a.creditsCharged || 0,
      LeadsReturned: a.leadsReturned || 0,
      Timestamp: a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'
    }));

    // Format Searches / History
    const formattedSearches = searches.map(s => ({
      ID: s._id.toString(),
      UserID: s.userId?.toString() || 'N/A',
      Query: s.query,
      Status: s.status,
      LeadCount: s.leadCount || 0,
      PagesCrawled: s.stats?.pagesCrawled || 0,
      CreatedAt: s.createdAt ? new Date(s.createdAt).toLocaleString() : 'N/A'
    }));

    return NextResponse.json({
      Users: formattedUsers,
      Revenue: formattedRevenue,
      AI_Costs: formattedCosts,
      Searches_History: formattedSearches
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

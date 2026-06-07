import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { id } = await params;
    const db = await getDb();
    
    const search = await db.collection('searches').findOne({ 
      _id: new ObjectId(id),
      userId: new ObjectId(authResult.user.id)
    });

    if (!search) {
      return NextResponse.json({ error: 'Search not found' }, { status: 404 });
    }

    // If completed, fetch the leads stored for this exact search
    let leads = [];
    if (search.status === 'completed') {
      leads = await db.collection('leads').find({ 
        userId: search.userId,
        searchId: search._id
      }).toArray();
    }

    return NextResponse.json({
      status: search.status,
      error: search.error || null,
      progress: search.progress || null,
      leadCount: search.leadCount || leads.length,
      leads: leads.map(({ _id, userId, searchId, chatId, searchQuery, leadId, createdAt, source, ...lead }) => ({
        ...lead,
        id: lead.id || leadId || _id.toString(),
        source,
        subreddit: lead.subreddit || source || 'reddit',
      })),
      insights: search.insights || null,
      totalScanned: search.totalScanned || 0,
      selectedSubreddits: search.selectedSubreddits || [],
      searchQueries: search.searchQueries || []
    }, { status: 200 });

  } catch (error) {
    console.error('Search status fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch search status' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'generated'; // generated | saved
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;
    const groupId = searchParams.get('groupId');
    const groupType = searchParams.get('groupType'); // 'monitor' or 'search'

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    
    // Determine collection
    const collectionName = tab === 'saved' ? 'saved_leads' : 'leads';
    const collection = db.collection(collectionName);

    // Build Query
    let query = { userId };
    
    if (groupId) {
      const gId = groupId.toString();
      if (groupType === 'monitor') {
        query.monitorId = { $in: [gId, new ObjectId(gId)] };
      } else if (groupType === 'search') {
        query.searchId = { $in: [gId, new ObjectId(gId)] };
      }
    }

    if (search) {
      query.$or = [
        { author: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { postTitle: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
        { context: { $regex: search, $options: 'i' } },
        { subreddit: { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch Data
    const [leads, total] = await Promise.all([
      collection
        .find(query)
        .sort({ [sortBy === 'createdAt' && tab === 'saved' ? 'savedAt' : sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query)
    ]);

    // Normalize Data
    const normalizedLeads = leads.map(lead => ({
      ...lead,
      _id: lead._id.toString(),
      createdAt: lead.createdAt || lead.savedAt,
      score: lead.score || lead.intentScore || 0,
      title: lead.title || lead.postTitle || 'No Title',
      body: lead.body || lead.context || lead.text || '',
      isSaved: tab === 'saved'
    }));

    return NextResponse.json({ 
      leads: normalizedLeads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

// Bulk Delete / Actions
export async function DELETE(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { ids, tab } = await request.json();
    if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'IDs required' }, { status: 400 });

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    const collectionName = tab === 'saved' ? 'saved_leads' : 'leads';
    
    const objectIds = ids.map(id => new ObjectId(id));
    await db.collection(collectionName).deleteMany({ _id: { $in: objectIds }, userId });

    return NextResponse.json({ success: true, message: `Deleted ${ids.length} leads` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json({ error: 'Failed to delete leads' }, { status: 500 });
  }
}

// Update Lead (Status, Notes, Tags)
export async function PATCH(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });

  try {
    const { id, tab, updates } = await request.json();
    if (!id || !updates) return NextResponse.json({ error: 'ID and updates required' }, { status: 400 });

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);
    const collectionName = tab === 'saved' ? 'saved_leads' : 'leads';
    
    const result = await db.collection(collectionName).updateOne(
      { _id: new ObjectId(id), userId },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Lead updated' });
  } catch (error) {
    console.error('Update lead error:', error);
    return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
  }
}

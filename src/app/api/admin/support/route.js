import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { sendSupportTicketReply } from '@/lib/email';
import { ObjectId } from 'mongodb';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  if (authResult.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const db = await getDb();
    const tickets = await db.collection('support_tickets').find({}).sort({ createdAt: -1 }).toArray();
    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error) {
    console.error('Fetch tickets error:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  if (authResult.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { ticketId, replyMessage } = await request.json();
    if (!ticketId || !replyMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = await getDb();
    const ticket = await db.collection('support_tickets').findOne({ _id: new ObjectId(ticketId) });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Send email to user
    await sendSupportTicketReply(ticket.email, ticket.subject, replyMessage);

    // Update ticket status
    await db.collection('support_tickets').updateOne(
      { _id: new ObjectId(ticketId) },
      { 
        $set: { 
          status: 'Responded/Resolved',
          replyMessage: replyMessage,
          repliedAt: new Date(),
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Reply to ticket error:', error);
    return NextResponse.json({ error: 'Failed to reply to ticket' }, { status: 500 });
  }
}

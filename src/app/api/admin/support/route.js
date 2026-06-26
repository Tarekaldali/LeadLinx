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
    let tickets = await db.collection('support_tickets').find({}).sort({ createdAt: -1 }).toArray();
    
    // Auto-populate registered_email for older tickets if missing
    for (let ticket of tickets) {
      if (!ticket.registered_email) {
        const emailToMatch = ticket.contact_email || ticket.email;
        if (emailToMatch) {
          const user = await db.collection('users').findOne({ email: emailToMatch });
          if (user) {
            ticket.registered_email = user.email;
          }
        }
      }
    }
    
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

    const emailToSendTo = ticket.contact_email || ticket.email;

    // Send email to user
    await sendSupportTicketReply(emailToSendTo, ticket.subject, replyMessage);

    // Update ticket with reply info but keep status independent
    await db.collection('support_tickets').updateOne(
      { _id: new ObjectId(ticketId) },
      { 
        $set: { 
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

export async function PATCH(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  if (authResult.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const { ticketId, status } = await request.json();
    if (!ticketId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const allowedStatuses = ['Open', 'In Progress', 'Solved', 'Not Solved', 'Spam'];
    if (!allowedStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const db = await getDb();
    const ticket = await db.collection('support_tickets').findOne({ _id: new ObjectId(ticketId) });
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await db.collection('support_tickets').updateOne(
      { _id: new ObjectId(ticketId) },
      { 
        $set: { 
          status: status,
          updatedAt: new Date()
        } 
      }
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Update ticket status error:', error);
    return NextResponse.json({ error: 'Failed to update ticket status' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  if (authResult.user.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  try {
    const url = new URL(request.url);
    const ticketId = url.searchParams.get('id');

    if (!ticketId) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });
    }

    const db = await getDb();
    const result = await db.collection('support_tickets').deleteOne({ _id: new ObjectId(ticketId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete ticket error:', error);
    return NextResponse.json({ error: 'Failed to delete ticket' }, { status: 500 });
  }
}

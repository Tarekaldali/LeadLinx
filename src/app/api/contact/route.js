import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { sendSupportTicketAlert } from '@/lib/email';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    // Attempt to get authenticated user, but don't fail if not logged in
    let registered_email = null;
    try {
      const authResult = await requireAuth(request);
      if (authResult.isAuthenticated && authResult.user) {
        registered_email = authResult.user.email;
      }
    } catch (e) {
      // Ignore auth error for public contact form
    }

    const db = await getDb();
    
    const ticket = {
      name: name.trim(),
      contact_email: email.trim().toLowerCase(),
      registered_email: registered_email,
      subject: subject.trim(),
      message: message.trim(),
      status: 'Open',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to the support_tickets collection
    await db.collection('support_tickets').insertOne(ticket);

    // Send email alert to admin
    await sendSupportTicketAlert(ticket);

    return NextResponse.json({ success: true, message: 'Message sent successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Contact form submission error:', error);
    return NextResponse.json({ error: 'Failed to submit message. Please try again later.' }, { status: 500 });
  }
}

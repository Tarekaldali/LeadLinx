import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const db = await getDb();
    const existing = await db.collection('subscribers').findOne({ email: email.toLowerCase() });

    if (existing) {
      return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
    }

    await db.collection('subscribers').insertOne({
      email: email.toLowerCase(),
      createdAt: new Date(),
      status: 'active'
    });

    return NextResponse.json({ message: 'Successfully subscribed' }, { status: 201 });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

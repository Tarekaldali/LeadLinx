import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = await getDb();
    const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = {
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || email.split('@')[0],
      role: 'user',
      plan: 'free',
      credits: 400,
      negativeKeywords: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActive: new Date(),
      searchCount: 0,
      leadsFound: 0,
    };

    const result = await db.collection('users').insertOne(user);
    user._id = result.insertedId;

    const token = generateToken(user);

    // Log signup event
    await db.collection('logs').insertOne({
      type: 'auth',
      action: 'signup',
      userId: result.insertedId,
      email: user.email,
      timestamp: new Date(),
    });

    const response = NextResponse.json({
      user: { id: result.insertedId, email: user.email, name: user.name, plan: user.plan, credits: user.credits, role: user.role },
      message: 'Account created successfully',
    }, { status: 201 });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

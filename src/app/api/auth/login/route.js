import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ error: 'Account has been suspended' }, { status: 403 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Update last active
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastActive: new Date() } }
    );

    const token = generateToken(user);

    // Log login event
    await db.collection('logs').insertOne({
      type: 'auth',
      action: 'login',
      userId: user._id,
      email: user.email,
      timestamp: new Date(),
    });

    const response = NextResponse.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        credits: user.credits,
        role: user.role,
      },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { generateToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { credential } = await request.json();
    
    // Verify Google ID Token
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = await res.json();
    
    if (!payload.email) {
      return NextResponse.json({ error: 'Invalid Google token' }, { status: 400 });
    }

    const db = await getDb();
    
    // Check if user exists
    let user = await db.collection('users').findOne({ email: payload.email });
    
    if (!user) {
      // Create new user
      const newUser = {
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        image: payload.picture,
        role: 'user',
        plan: 'free',
        credits: 400,
        createdAt: new Date(),
        lastLogin: new Date()
      };
      
      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
    } else {
      // Update last login
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { lastLogin: new Date(), image: payload.picture } }
      );
    }

    // Generate JWT
    const token = generateToken(user);

    const response = NextResponse.json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
      }
    });

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google Auth Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

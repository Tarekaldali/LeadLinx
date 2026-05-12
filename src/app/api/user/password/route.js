import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

export async function PUT(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If the user has a password, verify it
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }
    } else if (currentPassword) {
      // If user doesn't have a password yet but provided one, we can't verify it,
      // but we might allow setting it for the first time if they are authenticated.
      // However, usually we'd want them to verify via email.
      // For now, let's allow setting it if they are logged in.
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.collection('users').updateOne(
      { _id: userId },
      { $set: { password: hashedPassword, updatedAt: new Date() } }
    );

    return NextResponse.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

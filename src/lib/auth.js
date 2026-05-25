import { getServerSession } from 'next-auth';
import { authOptions } from './auth-config';
import { getDb } from './mongodb';
import bcrypt from 'bcryptjs';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(payload) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.NEXTAUTH_SECRET || 'fallback', { expiresIn: '7d' });
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const db = await getDb();
  const user = await db.collection('users').findOne(
    { email: session.user.email },
    { projection: { password: 0 } }
  );
  return user;
}

/**
 * requireAuth — works in Next.js App Router.
 * The session.user.id is populated by the JWT callback in auth-config.js
 * which syncs from the DB on every request.
 */
export async function requireAuth(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      console.warn('[AUTH] requireAuth: No session found');
      return { error: 'Unauthorized — please log in', status: 401 };
    }
    if (!session.user.id) {
      // Fallback: look up user by email to get the id
      const db = await getDb();
      const dbUser = await db.collection('users').findOne({ email: session.user.email });
      if (!dbUser) {
        console.warn('[AUTH] requireAuth: User not found in DB for email:', session.user.email);
        return { error: 'Unauthorized — user not found', status: 401 };
      }
      return { user: { ...session.user, id: dbUser._id.toString() } };
    }
    return { user: session.user };
  } catch (err) {
    console.error('[AUTH] requireAuth error:', err);
    return { error: 'Auth check failed', status: 500 };
  }
}

export async function requireAdmin(request) {
  const result = await requireAuth(request);
  if (result.error) return result;
  
  if (result.user.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }
  
  return result;
}

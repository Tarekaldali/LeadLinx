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

export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: 'Unauthorized', status: 401 };
  }
  return { user: session.user };
}

export async function requireAdmin() {
  const result = await requireAuth();
  if (result.error) return result;
  
  if (result.user.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }
  
  return result;
}


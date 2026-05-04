import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getDb } from './mongodb';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role || 'user' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    
    const decoded = verifyToken(token);
    if (!decoded) return null;
    
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );
    
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(request) {
  const token = request.cookies.get('token')?.value 
    || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return { error: 'Invalid token', status: 401 };
  }
  
  return { user: decoded };
}

export async function requireAdmin(request) {
  const result = await requireAuth(request);
  if (result.error) return result;
  
  if (result.user.role !== 'admin') {
    return { error: 'Forbidden - Admin access required', status: 403 };
  }
  
  return result;
}

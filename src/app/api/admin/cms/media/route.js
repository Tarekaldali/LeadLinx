import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function POST(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file received.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || 'image/jpeg';
    
    const db = await getDb();
    const result = await db.collection('media').insertOne({
      filename: file.name || 'upload',
      mimeType,
      data: buffer,
      createdAt: new Date(),
    });

    const fileUrl = `/api/media/${result.insertedId.toString()}`;

    return NextResponse.json({ url: fileUrl, success: true });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const db = await getDb();
    const media = await db.collection('media').findOne({ _id: new ObjectId(id) });

    if (!media || !media.data) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // `media.data` is stored as a MongoDB Binary object, extracting the buffer:
    const buffer = media.data.buffer || media.data; 

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': media.mimeType || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Fetch media error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

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
    // Create a unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const finalFilename = `${uniqueSuffix}-${filename}`;
    
    // Ensure the uploads directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, finalFilename);
    
    // Write file to public/uploads
    await fs.writeFile(filePath, buffer);

    // Return the public URL
    const fileUrl = `/uploads/${finalFilename}`;

    return NextResponse.json({ url: fileUrl, success: true });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}

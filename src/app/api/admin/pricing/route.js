import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const db = await getDb();
    const plans = await db.collection('plans').find({}).toArray();
    return NextResponse.json(plans);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return NextResponse.json(adminCheck, { status: adminCheck.status });

    const data = await request.json();
    const db = await getDb();
    
    const result = await db.collection('plans').insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return NextResponse.json({ message: 'Plan created successfully', id: result.insertedId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return NextResponse.json(adminCheck, { status: adminCheck.status });

    const { id, ...data } = await request.json();
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    
    await db.collection('plans').updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...data, 
          updatedAt: new Date() 
        } 
      }
    );
    
    return NextResponse.json({ message: 'Plan updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const adminCheck = await requireAdmin(request);
    if (adminCheck.error) return NextResponse.json(adminCheck, { status: adminCheck.status });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    const db = await getDb();
    const { ObjectId } = await import('mongodb');
    
    await db.collection('plans').deleteOne({ _id: new ObjectId(id) });
    
    return NextResponse.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}

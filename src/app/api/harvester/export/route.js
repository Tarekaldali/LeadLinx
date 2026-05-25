/**
 * LeadHarvester API — /api/harvester/export
 * Export harvested leads as CSV or JSON. Protected by auth.
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { requireAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { findByJobId, findByUserId, exportToCSV, exportToJSONL } from '@/lib/harvester/lead-store';

export async function GET(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const format = searchParams.get('format') || 'csv';
    const minScore = parseInt(searchParams.get('minScore') || '0', 10);

    const db = await getDb();
    const userId = new ObjectId(authResult.user.id);

    let leads;
    if (jobId) {
      leads = await findByJobId(db, jobId);
    } else {
      const result = await findByUserId(db, userId, { minScore, pageSize: 500 });
      leads = result.leads;
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads found for export.' }, { status: 404 });
    }

    if (format === 'json' || format === 'jsonl') {
      const jsonl = exportToJSONL(leads);
      return new NextResponse(jsonl, {
        headers: {
          'Content-Type': 'application/jsonl',
          'Content-Disposition': `attachment; filename="leads-${Date.now()}.jsonl"`,
        },
      });
    }

    // Default: CSV
    const csv = exportToCSV(leads);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${Date.now()}.csv"`,
      },
    });

  } catch (error) {
    console.error('[Harvester Export] Error:', error.message);
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 });
  }
}

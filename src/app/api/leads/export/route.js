import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function POST(request) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { leads, format } = await request.json();

    if (!leads?.length) {
      return NextResponse.json({ error: 'No leads to export' }, { status: 400 });
    }

    if (format === 'csv') {
      const headers = ['Title', 'Score', 'Reason', 'Urgency', 'User Type', 'Subreddit', 'Author', 'Badge', 'Pain Point', 'Link'];
      const rows = leads.map(l => [
        `"${(l.title || '').replace(/"/g, '""')}"`,
        l.intentScore || '',
        `"${(l.intentReason || '').replace(/"/g, '""')}"`,
        l.urgency || '',
        l.userType || '',
        l.subreddit || '',
        l.author || '',
        l.badge || '',
        `"${(l.painPoint || '').replace(/"/g, '""')}"`,
        l.link || '',
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="leadlinx-leads-${Date.now()}.csv"`,
        },
      });
    }

    // Default: JSON export
    const jsonExport = leads.map(l => ({
      title: l.title,
      intentScore: l.intentScore,
      intentReason: l.intentReason,
      urgency: l.urgency,
      userType: l.userType,
      painPoint: l.painPoint,
      badge: l.badge,
      replyAngle: l.replyAngle,
      subreddit: l.subreddit,
      author: l.author,
      link: l.link,
      engagementScore: l.engagementScore,
      upvotes: l.score,
      comments: l.numComments,
    }));

    return new Response(JSON.stringify(jsonExport, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="leadlinx-leads-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

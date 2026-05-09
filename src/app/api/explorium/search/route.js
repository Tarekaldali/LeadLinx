/**
 * Explorium Search API — /api/explorium/search
 * Redirects to the main LeadHarvester pipeline.
 * The Explorium integration has been superseded by the LeadHarvester system.
 */

import { NextResponse } from 'next/server';

export async function POST(request) {
  // Forward to the harvester endpoint
  const body = await request.json();
  const url = new URL('/api/harvester/run', request.url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': request.headers.get('cookie') || '',
    },
    body: JSON.stringify({
      query: body.query || '',
      mode: 'heuristics',
      maxPages: body.pageSize || 10,
    }),
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

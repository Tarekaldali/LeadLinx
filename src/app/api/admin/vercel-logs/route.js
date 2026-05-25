import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/vercel-logs
 * Fetches recent deployment runtime logs from the Vercel REST API.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID environment variables.
 */
export async function GET(request) {
  const authResult = await requireAdmin();
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // optional
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

  if (!VERCEL_TOKEN) {
    return NextResponse.json({
      error: 'VERCEL_TOKEN environment variable is not set. Add it to your Vercel project settings.',
      logs: [],
    });
  }

  try {
    // Step 1: Get the latest deployment
    let deploymentsUrl = `https://api.vercel.com/v6/deployments?limit=1&state=READY`;
    if (VERCEL_PROJECT_ID) deploymentsUrl += `&projectId=${VERCEL_PROJECT_ID}`;
    if (VERCEL_TEAM_ID) deploymentsUrl += `&teamId=${VERCEL_TEAM_ID}`;

    const deploymentsRes = await fetch(deploymentsUrl, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      cache: 'no-store',
    });

    if (!deploymentsRes.ok) {
      const err = await deploymentsRes.json().catch(() => ({}));
      return NextResponse.json({
        error: `Vercel API error: ${err?.error?.message || deploymentsRes.statusText}`,
        logs: [],
      });
    }

    const deploymentsData = await deploymentsRes.json();
    const deployment = deploymentsData.deployments?.[0];

    if (!deployment) {
      return NextResponse.json({ logs: [], message: 'No deployments found.' });
    }

    const deploymentId = deployment.uid;

    // Step 2: Get the runtime logs from that deployment
    let logsUrl = `https://api.vercel.com/v2/deployments/${deploymentId}/events?limit=100&direction=backward`;
    if (VERCEL_TEAM_ID) logsUrl += `&teamId=${VERCEL_TEAM_ID}`;

    const logsRes = await fetch(logsUrl, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      cache: 'no-store',
    });

    if (!logsRes.ok) {
      const err = await logsRes.json().catch(() => ({}));
      return NextResponse.json({
        error: `Failed to fetch logs: ${err?.error?.message || logsRes.statusText}`,
        logs: [],
      });
    }

    const logsText = await logsRes.text();
    // Vercel returns NDJSON (newline-delimited JSON)
    const rawLines = logsText
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);

    // Format into readable log entries
    const logs = rawLines
      .filter(e => e.type === 'stdout' || e.type === 'stderr' || e.type === 'error' || e.type === 'response')
      .map(e => ({
        id: e.id || Math.random().toString(36).slice(2),
        type: e.type === 'stderr' || e.type === 'error' ? 'error' : 'log',
        level: e.type === 'stderr' || e.type === 'error' ? 'error' : 'info',
        message: e.payload?.text || e.payload?.statusCode?.toString() || JSON.stringify(e.payload || ''),
        path: e.payload?.path || '',
        statusCode: e.payload?.statusCode || null,
        timestamp: e.date ? new Date(e.date).toISOString() : new Date().toISOString(),
        deploymentId,
      }))
      .reverse(); // Most recent last

    return NextResponse.json({
      logs,
      deploymentId,
      deploymentUrl: deployment.url,
      deploymentCreated: deployment.created,
    });
  } catch (error) {
    console.error('[Admin Vercel Logs] Error:', error);
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}

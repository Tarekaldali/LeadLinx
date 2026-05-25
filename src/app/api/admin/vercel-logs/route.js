import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

/**
 * GET /api/admin/vercel-logs
 * Fetches recent deployment runtime logs from the Vercel REST API.
 * Requires VERCEL_TOKEN and VERCEL_PROJECT_ID environment variables.
 */
export async function GET(request) {
  const authResult = await requireAdmin(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  // Trim whitespace/newlines that can sneak in from env var piping
  const VERCEL_TOKEN = (process.env.VERCEL_TOKEN || '').trim();
  const VERCEL_TEAM_ID = (process.env.VERCEL_TEAM_ID || '').trim() || undefined;
  const VERCEL_PROJECT_ID = (process.env.VERCEL_PROJECT_ID || '').trim() || 'prj_ERT4CUEdInkWli96rlSS8kAWZP33';

  if (!VERCEL_TOKEN) {
    return NextResponse.json({
      error: 'VERCEL_TOKEN environment variable is not set. Add it to your Vercel project settings.',
      logs: [],
    });
  }

  const authHeaders = {
    Authorization: `Bearer ${VERCEL_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    // Step 1: Get the latest deployment
    let deploymentsUrl = `https://api.vercel.com/v6/deployments?limit=3&state=READY&projectId=${VERCEL_PROJECT_ID}`;
    if (VERCEL_TEAM_ID) deploymentsUrl += `&teamId=${VERCEL_TEAM_ID}`;

    console.log(`[Vercel Logs] Fetching deployments for project: ${VERCEL_PROJECT_ID}`);
    
    const deploymentsRes = await fetch(deploymentsUrl, {
      headers: authHeaders,
      cache: 'no-store',
    });

    if (!deploymentsRes.ok) {
      const err = await deploymentsRes.json().catch(() => ({}));
      const errMsg = err?.error?.message || err?.error?.code || deploymentsRes.statusText;
      console.error('[Admin Vercel Logs] Deployments API error:', errMsg, 'Status:', deploymentsRes.status);
      
      // If 403, try without projectId filter as a diagnostic
      if (deploymentsRes.status === 403 || deploymentsRes.status === 401) {
        return NextResponse.json({
          error: `Vercel API error: ${errMsg}`,
          hint: 'Token may be expired or lack permissions. Create a new token at vercel.com/account/tokens with "Full Account" scope.',
          debug: {
            tokenPrefix: VERCEL_TOKEN.substring(0, 10) + '...',
            projectId: VERCEL_PROJECT_ID,
            teamId: VERCEL_TEAM_ID || 'none',
          },
          logs: [],
        });
      }

      return NextResponse.json({
        error: `Vercel API error: ${errMsg}`,
        logs: [],
      });
    }

    const deploymentsData = await deploymentsRes.json();
    const deployment = deploymentsData.deployments?.[0];

    if (!deployment) {
      return NextResponse.json({ logs: [], message: 'No READY deployments found for this project.' });
    }

    const deploymentId = deployment.uid;
    console.log(`[Vercel Logs] Found deployment: ${deploymentId} (${deployment.url})`);

    // Step 2: Try the runtime logs endpoint (v3 first, fallback to v2 events)
    let logs = [];

    // Attempt 1: v2 deployment events (build + runtime)
    let logsUrl = `https://api.vercel.com/v2/deployments/${deploymentId}/events?limit=200&direction=backward`;
    if (VERCEL_TEAM_ID) logsUrl += `&teamId=${VERCEL_TEAM_ID}`;

    const logsRes = await fetch(logsUrl, {
      headers: authHeaders,
      cache: 'no-store',
    });

    if (logsRes.ok) {
      const logsText = await logsRes.text();
      const rawLines = logsText
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);

      logs = rawLines
        .filter(e => e.type === 'stdout' || e.type === 'stderr' || e.type === 'error' || e.type === 'response' || e.type === 'request')
        .map(e => ({
          id: e.id || Math.random().toString(36).slice(2),
          type: e.type === 'stderr' || e.type === 'error' ? 'error' : (e.type === 'response' ? 'response' : 'log'),
          level: e.type === 'stderr' || e.type === 'error' ? 'error' : (e.type === 'response' ? 'info' : 'info'),
          message: e.payload?.text || (e.payload?.statusCode ? `${e.payload.method || 'GET'} ${e.payload.path || '/'} → ${e.payload.statusCode}` : JSON.stringify(e.payload || '')),
          path: e.payload?.path || '',
          statusCode: e.payload?.statusCode || null,
          method: e.payload?.method || null,
          timestamp: e.date ? new Date(e.date).toISOString() : new Date().toISOString(),
          deploymentId,
        }))
        .reverse();
    } else {
      console.warn(`[Vercel Logs] Events API returned ${logsRes.status}, trying fallback...`);
      
      // Attempt 2: Try the project-level logs API
      let projectLogsUrl = `https://api.vercel.com/v2/projects/${VERCEL_PROJECT_ID}/logs?limit=100`;
      if (VERCEL_TEAM_ID) projectLogsUrl += `&teamId=${VERCEL_TEAM_ID}`;

      const projectLogsRes = await fetch(projectLogsUrl, {
        headers: authHeaders,
        cache: 'no-store',
      });

      if (projectLogsRes.ok) {
        const projectLogsData = await projectLogsRes.json();
        logs = (projectLogsData.logs || projectLogsData || []).map(e => ({
          id: e.id || Math.random().toString(36).slice(2),
          type: e.level === 'error' ? 'error' : 'log',
          level: e.level || 'info',
          message: e.message || e.text || JSON.stringify(e),
          path: e.path || e.requestPath || '',
          statusCode: e.statusCode || null,
          timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : new Date().toISOString(),
          deploymentId,
        }));
      } else {
        const fallbackErr = await projectLogsRes.json().catch(() => ({}));
        logs = [{
          id: 'error-0',
          type: 'error',
          level: 'error',
          message: `Both log endpoints failed. Events: ${logsRes.status}, Project Logs: ${projectLogsRes.status}. Error: ${fallbackErr?.error?.message || 'Unknown'}`,
          path: '',
          statusCode: null,
          timestamp: new Date().toISOString(),
          deploymentId,
        }];
      }
    }

    return NextResponse.json({
      logs,
      deploymentId,
      deploymentUrl: deployment.url,
      deploymentCreated: deployment.created,
      totalLogs: logs.length,
    });
  } catch (error) {
    console.error('[Admin Vercel Logs] Error:', error);
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}

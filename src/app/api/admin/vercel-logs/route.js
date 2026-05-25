import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await requireAdmin(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;
    const token = process.env.VERCEL_TOKEN;

    if (!projectId || !token) {
      return NextResponse.json(
        { error: 'Vercel configuration missing in environment variables.' },
        { status: 400 }
      );
    }

    // Build the Vercel API URL
    let url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1`;
    if (teamId) url += `&teamId=${teamId}`;

    const depRes = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!depRes.ok) {
      const errTxt = await depRes.text();
      throw new Error(`Failed to fetch deployments: ${depRes.status} ${errTxt}`);
    }

    const depData = await depRes.json();
    const latestDeployment = depData.deployments?.[0];

    if (!latestDeployment) {
      return NextResponse.json({ logs: [] });
    }

    // Fetch logs for this deployment
    let logsUrl = `https://api.vercel.com/v2/deployments/${latestDeployment.uid}/events?direction=backward&limit=100`;
    if (teamId) logsUrl += `&teamId=${teamId}`;

    const logsRes = await fetch(logsUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!logsRes.ok) {
      const errTxt = await logsRes.text();
      throw new Error(`Failed to fetch logs: ${logsRes.status} ${errTxt}`);
    }

    const logsData = await logsRes.json();
    
    // Process logs
    const logs = (logsData || []).map(event => ({
      id: event.id,
      timestamp: event.created,
      message: event.payload?.text || event.payload?.message || JSON.stringify(event.payload),
      type: event.type === 'stderr' ? 'error' : 'info',
      source: event.source
    }));

    return NextResponse.json({ 
      logs,
      deploymentId: latestDeployment.uid,
      deploymentUrl: latestDeployment.url,
      deploymentCreated: latestDeployment.created
    });
  } catch (error) {
    console.error('Vercel logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

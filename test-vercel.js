import fetch from 'node-fetch';

async function getLogs() {
  const url = 'https://api.vercel.com/v8/projects/prj_ERT4CUEdInkWli96rlSS8kAWZP33/events?limit=100';
  const token = 'vcp_0vlvVumwA1TArIuP8mv84Mm5ENdpR3Ar7w0ZkgBpbuvZLq2hph26D527';
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!res.ok) {
    console.error(res.status, await res.text());
    return;
  }
  
  const data = await res.json();
  data.events.forEach(e => {
    if (e.text && (e.text.includes('Error') || e.text.includes('Exception') || e.text.includes('Failed'))) {
      console.log(`[${new Date(e.created).toISOString()}] ${e.text}`);
    }
  });
}

getLogs();

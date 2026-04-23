export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing env vars' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=minimal',
  };

  if (req.method === 'GET') {
    const { code, role } = req.query;
    const url = `${SUPABASE_URL}/rest/v1/pairs?code=eq.${code}&role=eq.${role}&select=scores&limit=1`;
    const r = await fetch(url, { headers });
    const data = await r.json();
    return res.status(200).json(data.length > 0 ? { found: true, scores: data[0].scores } : { found: false });
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const url = `${SUPABASE_URL}/rest/v1/pairs`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ code: body.code, role: body.role, scores: body.scores }),
    });
    return r.ok ? res.status(200).json({ ok: true }) : res.status(500).json({ error: 'DB Error' });
  }
}
3. 修改 vercel.json (路由转发)
覆盖根目录下的 vercel.json 为以下内容，确保 /api/sync 能找到上面的文件：

JSON
{
  "rewrites": [
    { "source": "/api/sync", "destination": "/api/sync.js" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}

// Vercel Serverless Function
// 用原生 fetch 调 Supabase REST API，无需安装任何 npm 包
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Missing env vars: SUPABASE_URL or SUPABASE_ANON_KEY' });
  }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=minimal',
  };

  // GET — 读取答案
  if (req.method === 'GET') {
    const { code, role } = req.query;
    if (!code || !role) return res.status(400).json({ error: 'missing code or role' });

    const url = `${SUPABASE_URL}/rest/v1/pairs?code=eq.${code}&role=eq.${role}&select=scores&limit=1`;
    const r = await fetch(url, { headers });
    const data = await r.json();

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(200).json({ found: false });
    }
    return res.status(200).json({ found: true, scores: data[0].scores });
  }

  // POST — 保存答案
  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { code, role, scores } = body;
    if (!code || !role || !scores) return res.status(400).json({ error: 'missing fields' });

    const url = `${SUPABASE_URL}/rest/v1/pairs`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({ code, role, scores }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(500).json({ error: err });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'method not allowed' });
}

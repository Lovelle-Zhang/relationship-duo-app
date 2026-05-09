const https = require('https');

// 公众号配置
const MP_APPID = 'wx8853daf2ec63618f';
const MP_SECRET = process.env.MP_SECRET || ''; // 在 Vercel 环境变量里设置

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'missing code' });

  try {
    const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${MP_APPID}&secret=${MP_SECRET}&code=${code}&grant_type=authorization_code`;
    const data = await httpsGet(url);

    if (data.errcode) {
      return res.status(400).json({ error: data.errmsg, code: data.errcode });
    }

    res.status(200).json({ openid: data.openid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

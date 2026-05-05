const crypto = require('crypto');
const https = require('https');

const CONFIG = {
  MCHID: process.env.WX_MCHID || '1741858680',
  SERIAL_NO: process.env.WX_SERIAL_NO || '18ABFE506C033FF75448A0E02D16A46E1A1C5A6A',
  PRIVATE_KEY: process.env.WX_PRIVATE_KEY ? process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n') : `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDrXkkTc7QJI/Ys
u01xO5uW1oZ+wiGZIXfj7CvLz6QfLvMRFO+0yIULMskwTvXnU5WOoG5+n8ZGBEX9
Qr4sWIP9olQUSj3WLsqLzzrg+rrmd0njJRgiOJ+M8KOK+bvsEl5IelHq1VXuULc2
OMEP1f2teB6fQPKJkjSOHEETOGr2FyAor5bHvUGUCfC8GMqe2d4OlnUsq+8s/VsR
CnLvF4jlcHpmwqdQWR3kb7kMWz0bkxldRLoTikGBSpobsiFHeQy9/aeRAchYlVji
v/luQ4bZeJxprUSdVqt0/b/gONc1b6hf39IJflK7eKszOoezibjsLCzt2GkA9S7H
0HYJJhrjAgMBAAECggEAdOkDcVcSgUvMltF+mRUbpqPucH4rRC3cqGkCJB2Cjz65
261Dl8/WTgau6oD+IiZhblQALoNccCDlRvRlFA/vmAeOrflml8HsN9/6hg/k0F9G
Yz5kq3LmxZIuGfUMRCmnjWa80+Gd6l9LcfJk62HGvOiihUY0cuMdmc0tAcgPUSad
pUb22qAJUKkbmcQbsXVuQbA862QQNYxpTm2VjHsF1nU0aQ1NZCVKZKYfrfy1lE3q
Bt/7AKkzZH+ElOrPDDi8Ow4QtGKf27aro+AR8IDzHI77rYv2bRp5wJFPyXYzu3zh
I0HqYgHn83nyzJ550kyzy8OV34lOsfFNNdDz091paQKBgQD26W0pF748qRAs+4PQ
TfBU7pZLB5oIzcjeuHhrT1U6MWio9rAhLqJrzu75pOYhU5GrY/gIPi0TcQScpzVr
8jPAjZsLDlnuCV1v4X8rzTsEtoqhXfhmxioQBzWG5RFCdvUpsUfcuzKB4YkMA+sT
QgjKhtzNKlN4YRb2TwbKIgKkLwKBgQD0CBaJs9/AhLEdMxPgjH9fX6IO2/sq/Tyw
alodwMypdYK4Iw++k6CsA21aKzEaa7Fi3Q8+3PeLPWHwPWtuYgksSzscpPrZOrpv
iiNOdEWLbYUUXy/OZRkxGxs5sMy1uH01/jmbi65YbugL6Mx3iyj6eKkdOYLEg0Yy
0Q2auKTjjQKBgQDkeEY7+e5b7ww6s1jbDONPk52aO6R6dQBjpko28aepO0Le5bVA
XwiHvWk/sygGum9WKiC+b9oB3VgpJEe4ZNsiV2WZq2PncN72wa+M9lCgIdDRVESf
xMnzHtiWw6te1vgv5gza4JTxvaG0boO8xCOiU3xIk9u8zgoTTDi6HRJYnQKBgQCl
1i1CzTtcgJBAcKqsaa5RqRLfmD0bHNc2aD/vgktTSelYq3MSpw6EdxvEMCABfXgh
4Gpw5QdQ15kMAyFT9UmYkVONhsx1/YQfMrgFo9xzAS10B6/cSjYRegNJdE3ZnJNy
st6BRy5nKI+HMGBrSOXDOWZr1t54H2IAPLNLFvnvLQKBgQDauC3Pzqm+SX06vB6D
ng7OxuqVlBChAmW1FqxmL04wcBl4ssg15P5LQy1BpSboIvbPBy73r1vOOoSlf7kz
+X8FeTKTpLhll/UyWwcl4VrXA9o9vhZxYSuBUN9SXeHtG50Zn0SLuCyUU1mnp89R
0omwnGNxoi1IPIVhxmiMSA+oDQ==
-----END PRIVATE KEY-----`
};

function sign(method, url, timestamp, nonce, body) {
  const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
  const s = crypto.createSign('RSA-SHA256');
  s.update(message);
  return s.sign(CONFIG.PRIVATE_KEY, 'base64');
}

function getAuthHeader(method, url, body) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = sign(method, url, timestamp, nonce, body);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${CONFIG.MCHID}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${CONFIG.SERIAL_NO}"`;
}

function wxRequest(method, path) {
  return new Promise((resolve, reject) => {
    const body = '';
    const options = {
      hostname: 'api.mch.weixin.qq.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0',
        'Authorization': getAuthHeader(method, path, body)
      }
    };
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseBody));
        } else {
          reject(new Error(`API错误: ${res.statusCode} ${responseBody}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: '仅支持GET' });

  if (!CONFIG.PRIVATE_KEY) {
    return res.status(500).json({ error: '服务器未配置支付密钥' });
  }

  try {
    const { order } = req.query;
    if (!order) return res.status(400).json({ error: '缺少订单号' });

    const path = `/v3/pay/transactions/out-trade-no/${order}?mchid=${CONFIG.MCHID}`;
    const result = await wxRequest('GET', path);
    
    res.status(200).json({ 
      paid: result.trade_state === 'SUCCESS',
      state: result.trade_state
    });
  } catch (error) {
    console.error('查询订单失败:', error);
    res.status(200).json({ paid: false, error: error.message });
  }
};

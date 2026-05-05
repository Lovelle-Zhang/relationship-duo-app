const crypto = require('crypto');
const https = require('https');

const CONFIG = {
  MCHID: process.env.WX_MCHID || '1741858680',
  SERIAL_NO: process.env.WX_SERIAL_NO || '18ABFE506C033FF75448A0E02D16A46E1A1C5A6A',
  PRIVATE_KEY: process.env.WX_PRIVATE_KEY ? process.env.WX_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
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

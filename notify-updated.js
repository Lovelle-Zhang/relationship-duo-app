const crypto = require('crypto');

const API_V3_KEY = process.env.WX_API_V3_KEY;
const SB = process.env.SUPABASE_URL;
const SK = process.env.SUPABASE_ANON_KEY;

function decrypt(ciphertext, nonce, associated_data) {
  const key = Buffer.from(API_V3_KEY, 'utf8');
  const iv = Buffer.from(nonce, 'utf8');
  const data = Buffer.from(associated_data, 'utf8');
  const encrypted = Buffer.from(ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(encrypted.slice(-16));
  decipher.setAAD(data);
  let decrypted = decipher.update(encrypted.slice(0, -16));
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ code: 'FAIL', message: '仅支持POST' });

  if (!API_V3_KEY || !SB || !SK) {
    return res.status(500).json({ code: 'FAIL', message: '服务器配置缺失' });
  }

  try {
    const { resource } = req.body;
    const decryptedData = decrypt(resource.ciphertext, resource.nonce, resource.associated_data);
    
    if (decryptedData.trade_state === 'SUCCESS') {
      const out_trade_no = decryptedData.out_trade_no;
      const code = out_trade_no.split('_')[1];
      
      await fetch(SB + '/rest/v1/pairs?code=eq.' + code, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SK,
          'Authorization': 'Bearer ' + SK
        },
        body: JSON.stringify({ unlocked: true })
      });
      
      console.log(`支付成功: 邀请码 ${code} 已解锁`);
    }
    
    res.status(200).json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    console.error('处理回调失败:', error);
    res.status(500).json({ code: 'FAIL', message: error.message });
  }
};

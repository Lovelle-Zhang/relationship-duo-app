// Vercel Serverless Function
// 路径：/api/pair.js → 自动映射到 /api/pair

import { createClient } from '@supabase/supabase-js';

// 直接写入凭证（临时方案）
const supabase = createClient(
    'https://esfuazchkbbtccxtamwp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZnVhemNoa2JidGNjeHRhbXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTg2ODUsImV4cCI6MjA5MjM3NDY4NX0.xV6Vvv4P0W4ky853yC9OvqOaSAyDErZVTM9UfCUidpQ'
);

// 生成 6 位随机配对码
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆字符
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export default async function handler(req, res) {
    // 允许跨域（如果需要）
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET：查询配对状态
    if (req.method === 'GET') {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({ error: '缺少配对码' });
        }

        try {
            const { data, error } = await supabase
                .from('pairs')
                .select('*')
                .eq('code', code.toUpperCase())
                .single();

            if (error || !data) {
                return res.status(404).json({ error: '配对码不存在' });
            }

            if (data.status === 'paired') {
                return res.json({
                    status: 'paired',
                    partner: data.user2_name,
                    paired_at: data.paired_at
                });
            } else {
                return res.json({ status: 'waiting' });
            }
        } catch (err) {
            return res.status(500).json({ error: '服务器错误' });
        }
    }

    // POST：创建或加入配对
    if (req.method === 'POST') {
        const { action, nickname, code } = req.body;

        // 创建配对
        if (action === 'create') {
            if (!nickname) {
                return res.status(400).json({ error: '缺少昵称' });
            }

            const newCode = generateCode();

            try {
                const { error } = await supabase
                    .from('pairs')
                    .insert({
                        code: newCode,
                        user1_name: nickname,
                        status: 'waiting'
                    });

                if (error) {
                    return res.status(500).json({ error: '创建失败', detail: error.message });
                }

                return res.json({ code: newCode });
            } catch (err) {
                return res.status(500).json({ error: '服务器错误' });
            }
        }

        // 加入配对
        if (action === 'join') {
            if (!nickname || !code) {
                return res.status(400).json({ error: '缺少昵称或配对码' });
            }

            try {
                // 查找配对记录
                const { data: pair, error: fetchError } = await supabase
                    .from('pairs')
                    .select('*')
                    .eq('code', code.toUpperCase())
                    .eq('status', 'waiting')
                    .single();

                if (fetchError || !pair) {
                    return res.status(404).json({ error: '配对码无效或已使用' });
                }

                // 更新为已配对
                const { error: updateError } = await supabase
                    .from('pairs')
                    .update({
                        user2_name: nickname,
                        status: 'paired',
                        paired_at: new Date().toISOString()
                    })
                    .eq('code', code.toUpperCase());

                if (updateError) {
                    return res.status(500).json({ error: '配对失败' });
                }

                return res.json({
                    success: true,
                    partner: pair.user1_name,
                    paired_at: new Date().toISOString()
                });
            } catch (err) {
                return res.status(500).json({ error: '服务器错误' });
            }
        }

        return res.status(400).json({ error: '无效的操作' });
    }

    return res.status(405).json({ error: '不支持的请求方法' });
}

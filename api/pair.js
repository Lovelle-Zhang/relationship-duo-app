// Vercel Serverless Function - 关系显影剂双人版 API
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://esfuazchkbbtccxtamwp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzZnVhemNoa2JidGNjeHRhbXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3OTg2ODUsImV4cCI6MjA5MjM3NDY4NX0.xV6Vvv4P0W4ky853yC9OvqOaSAyDErZVTM9UfCUidpQ'
);

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET: 查询某一方是否完成
    if (req.method === 'GET') {
        const { code, role } = req.query;

        if (!code || !role) {
            return res.status(400).json({ error: '缺少参数' });
        }

        try {
            const { data, error } = await supabase
                .from('pairs')
                .select('*')
                .eq('code', code.toUpperCase())
                .single();

            if (error || !data) {
                return res.json({ found: false });
            }

            // 检查指定角色是否完成
            if (role === 'A') {
                return res.json({
                    found: !!data.user1_name,
                    scores: data.user1_name ? JSON.parse(data.user1_name) : null
                });
            } else if (role === 'B') {
                return res.json({
                    found: !!data.user2_name,
                    scores: data.user2_name ? JSON.parse(data.user2_name) : null
                });
            }

            return res.status(400).json({ error: '无效的角色' });
        } catch (err) {
            return res.status(500).json({ error: '服务器错误' });
        }
    }

    // POST: 提交答案
    if (req.method === 'POST') {
        const { code, role, scores } = req.body;

        if (!code || !role || !scores) {
            return res.status(400).json({ error: '缺少参数' });
        }

        try {
            const codeUpper = code.toUpperCase();
            const scoresJson = JSON.stringify(scores);

            // 查找是否已存在
            const { data: existing } = await supabase
                .from('pairs')
                .select('*')
                .eq('code', codeUpper)
                .single();

            if (existing) {
                // 更新现有记录
                const updateData = role === 'A' 
                    ? { user1_name: scoresJson }
                    : { user2_name: scoresJson, status: 'paired', paired_at: new Date().toISOString() };

                const { error } = await supabase
                    .from('pairs')
                    .update(updateData)
                    .eq('code', codeUpper);

                if (error) {
                    return res.status(500).json({ error: '更新失败', detail: error.message });
                }

                return res.json({ success: true });
            } else {
                // 创建新记录（A 方发起）
                if (role !== 'A') {
                    return res.status(404).json({ error: '配对码不存在' });
                }

                const { error } = await supabase
                    .from('pairs')
                    .insert({
                        code: codeUpper,
                        user1_name: scoresJson,
                        status: 'waiting'
                    });

                if (error) {
                    return res.status(500).json({ error: '创建失败', detail: error.message });
                }

                return res.json({ success: true });
            }
        } catch (err) {
            return res.status(500).json({ error: '服务器错误' });
        }
    }

    return res.status(405).json({ error: '不支持的请求方法' });
}' });
}

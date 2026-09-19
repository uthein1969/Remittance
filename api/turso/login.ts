import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    // Frontend မှ ပေးပို့နိုင်သည့် key ပုံစံအားလုံးကို လက်ခံစစ်ဆေးခြင်း
    const rawIdentifier = body?.username || body?.userId || body?.user_id || body?.id;
    const identifier = rawIdentifier ? String(rawIdentifier).trim().replace(/^@/, '') : '';

    if (!identifier) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username or User ID is required',
        receivedBody: body 
      });
    }

    // system_users table တွင် username သို့မဟုတ် id ဖြင့် တိုက်ဆိုင်စစ်ဆေးခြင်း
    const userRes = await client.execute({
      sql: 'SELECT * FROM system_users WHERE LOWER(username) = LOWER(?) OR id = ? OR username = ? LIMIT 1;',
      args: [identifier, identifier, `@${identifier}`]
    });

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: `User '${identifier}' not found in Turso DB` });
    }

    const row: any = userRes.rows[0];
    const user = {
      id: String(row.id),
      username: String(row.username).replace(/^@/, ''),
      name: String(row.full_name || row.username),
      fullName: String(row.full_name || row.username),
      email: String(row.email || ''),
      role: String(row.role || 'MAKER'),
      branchId: String(row.branch_id || 'BR-001'),
      isActive: Boolean(row.is_active ?? true),
      phone: String(row.phone || ''),
      status: String(row.status || 'ACTIVE')
    };

    return res.status(200).json({
      success: true,
      user,
      message: 'Login successful'
    });
  } catch (err: any) {
    console.error('Turso login error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
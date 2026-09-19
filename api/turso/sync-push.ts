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
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const branches = body?.branches || [];
    const users = body?.users || [];
    let branchesSaved = 0;
    let usersSaved = 0;

    // ၁။ Branches Data များ သိမ်းဆည်းခြင်း
    for (const b of branches) {
      const branchCode = b.code || b.branchCode || b.branch_code || b.id;
      if (!b.id && !branchCode) continue;

      await client.execute({
        sql: `INSERT INTO branches (
          id, code, city, phone,
          name_en, name_mm, manager_name, status, address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code=excluded.code,
          city=excluded.city,
          phone=excluded.phone,
          name_en=excluded.name_en,
          name_mm=excluded.name_mm,
          manager_name=excluded.manager_name,
          status=excluded.status,
          address=excluded.address;`,
        args: [
          b.id || `BR-${branchCode}`,
          branchCode || 'BR-001',
          b.city || '',
          b.phone || '',
          b.nameEn || b.name_en || b.name || '',
          b.nameMm || b.name_mm || '',
          b.managerName || b.manager_name || '',
          b.status || 'ACTIVE',
          b.address || '',
          b.createdAt || new Date().toISOString()
        ]
      });
      branchesSaved++;
    }

    // ၂။ Users Data များ system_users Table သို့ သိမ်းဆည်းခြင်း
    for (const u of users) {
      const username = String(u.username || '').trim().replace(/^@/, '');
      if (!username) continue;

      const userId = u.id || `USR-${username}`;
      const branchId = u.branchId || u.branch_id || 'BR-001';
      const role = u.role || 'MAKER';
      const fullName = u.fullName || u.name || u.name_en || username;
      const email = u.email || `${username}@remit.internal`;
      const phone = u.phone || '';
      const status = u.status || 'ACTIVE';
      const isActive = u.isActive ?? u.is_active ?? 1;

      await client.execute({
        sql: `INSERT INTO system_users (
          id, username, full_name, email, role, branch_id, is_active, phone, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username=excluded.username,
          full_name=excluded.full_name,
          email=excluded.email,
          role=excluded.role,
          branch_id=excluded.branch_id,
          is_active=excluded.is_active,
          phone=excluded.phone,
          status=excluded.status;`,
        args: [
          userId,
          username,
          fullName,
          email,
          role,
          branchId,
          isActive ? 1 : 0,
          phone,
          status,
          u.createdAt || new Date().toISOString()
        ]
      });
      usersSaved++;
    }

    return res.status(200).json({
      success: true,
      message: 'Sync push completed successfully',
      branchesSaved,
      usersSaved
    });
  } catch (err: any) {
    console.error('Turso sync-push error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
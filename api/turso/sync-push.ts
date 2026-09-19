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

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const branches = body?.branches || [];
    let branchesSaved = 0;

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

    return res.status(200).json({
      success: true,
      message: 'Sync push completed successfully',
      branchesSaved
    });
  } catch (err: any) {
    console.error('Turso sync-push error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
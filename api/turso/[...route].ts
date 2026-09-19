import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io';
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // URL Path ခွဲခြားခြင်း (ဥပမာ: status, sync-pull, sync-push)
  const { route } = req.query;
  const action = Array.isArray(route) ? route[0] : route;

  try {
    // 1. /api/turso/status
    if (action === 'status' || action === 'test') {
      const dbRes = await client.execute('SELECT 1 as connected;');
      return res.status(200).json({
        connected: true,
        database: TURSO_URL,
        tablesCount: 10,
        timestamp: new Date().toISOString()
      });
    }

    // 2. /api/turso/sync-pull
    if (action === 'sync-pull') {
      const [txRes, rateRes, custRes, auditRes, userRes, branchRes] = await Promise.all([
        client.execute('SELECT * FROM remittance_transactions ORDER BY created_at DESC LIMIT 500;'),
        client.execute('SELECT * FROM exchange_rates;'),
        client.execute('SELECT * FROM customer_profiles;'),
        client.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200;'),
        client.execute('SELECT * FROM system_users;'),
        client.execute('SELECT * FROM branches;')
      ]);

      const branches = branchRes.rows.map((row: any) => {
        const bCode = String(row.code || row.id || '');
        const cityStr = String(row.city || '').toLowerCase();
        const idStr = String(row.id || '').toUpperCase();
        const countryCode = (cityStr.includes('singapore') || idStr.includes('SG')) ? 'SG' : 'MM';

        return {
          id: String(row.id || bCode),
          code: bCode,
          branchCode: bCode,
          countryCode,
          city: String(row.city || ''),
          phone: String(row.phone || ''),
          nameEn: String(row.name_en || ''),
          nameMm: String(row.name_mm || ''),
          managerName: String(row.manager_name || ''),
          status: String(row.status || 'ACTIVE'),
          address: String(row.address || '')
        };
      });

      const users = userRes.rows.map((row: any) => ({
        id: String(row.id),
        username: String(row.username),
        name: String(row.full_name || row.username),
        fullName: String(row.full_name || row.username),
        email: String(row.email || ''),
        role: String(row.role || 'MAKER'),
        branchId: String(row.branch_id || 'BR-001'),
        isActive: Boolean(row.is_active ?? true),
        phone: String(row.phone || ''),
        status: String(row.status || 'ACTIVE')
      }));

      return res.status(200).json({
        success: true,
        data: {
          transactions: txRes.rows,
          exchangeRates: rateRes.rows,
          customers: custRes.rows,
          auditLogs: auditRes.rows,
          users,
          branches
        }
      });
    }

    // 3. /api/turso/sync-push
    if (action === 'sync-push') {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      let branchesSaved = 0;

      if (data.branches && Array.isArray(data.branches)) {
        for (const b of data.branches) {
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
      }

      return res.status(200).json({
        success: true,
        message: 'Sync push completed successfully',
        branchesSaved
      });
    }

    return res.status(404).json({ error: `Route /api/turso/${action} not found` });
  } catch (error: any) {
    console.error('Turso API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
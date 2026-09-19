import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN
    });

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
      const nameStr = String(row.name_en || '').toLowerCase();

      let countryCode = 'MM';
      if (cityStr.includes('singapore') || idStr.includes('SG')) {
        countryCode = 'SG';
      } else if (cityStr.includes('bangkok') || cityStr.includes('thailand') || idStr.includes('TH') || nameStr.includes('big c')) {
        countryCode = 'TH';
      }

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
  } catch (err: any) {
    console.error('Turso sync-pull error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
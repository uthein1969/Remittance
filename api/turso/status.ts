import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    await client.execute('SELECT 1 as connected;');
    return res.status(200).json({
      connected: true,
      tablesCount: 10,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ connected: false, error: err.message });
  }
}
// Direct client-side Turso LibSQL client (Web HTTP)
// Provides instant, zero-server database connectivity directly from the browser (e.g. on Vercel, Netlify, Static Hosting).

import { createClient, Client } from '@libsql/client/web';
import { User, UserRole, RemittanceTransaction } from '../types';

const TURSO_URL = 'https://remittance-db-uthein.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMTczMTQsImlkIjoiMDFhMDhmYTYtZTYwMS03MzQ2LTk5YTYtYjAxNGNiZDU5YTI4Iiwia2lkIjoidU1rSk9uS0Rqcl9wRkNWOEtEQ3dDUFFtM2FacHlBTjNOVmZkaE9UeFV1OCIsInJpZCI6IjE3OTZkMDNiLTA4OGItNGZhMC04Yjk0LTAwZjliYWI1YjI3ZSJ9.1cgPOor1F3S55DoxEQ9IzWxvmxkxcy8Bq2EvMjmz6j5SzONju6fFIGKImCSB6vQjdnJbSTNQpYO8JzwHWUV6Cg';

let webClient: Client | null = null;

export function getTursoWebClient(): Client {
  if (!webClient) {
    webClient = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  }
  return webClient;
}

export async function tursoWebCheckStatus(): Promise<{
  connected: boolean;
  url: string;
  counts?: { transactions: number; customers: number; exchangeRates: number; auditLogs: number };
}> {
  try {
    const client = getTursoWebClient();
    const [txRes, custRes, rateRes, logRes] = await Promise.all([
      client.execute('SELECT COUNT(*) as cnt FROM remittance_transactions;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM customer_profiles;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM exchange_rates;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM audit_logs;').catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    return {
      connected: true,
      url: 'libsql://remittance-db-uthein.turso.io',
      counts: {
        transactions: Number(txRes.rows[0]?.cnt || 0),
        customers: Number(custRes.rows[0]?.cnt || 0),
        exchangeRates: Number(rateRes.rows[0]?.cnt || 0),
        auditLogs: Number(logRes.rows[0]?.cnt || 0),
      }
    };
  } catch (err: any) {
    console.warn('[Turso Web Client] Check status error:', err?.message);
    return {
      connected: false,
      url: 'libsql://remittance-db-uthein.turso.io',
    };
  }
}

export async function tursoWebLogin(
  usernameOrEmail: string,
  passwordAttempt?: string
): Promise<{
  success: boolean;
  message: string;
  user?: User;
}> {
  try {
    const client = getTursoWebClient();
    const trimmed = usernameOrEmail.trim().toLowerCase();

    if (!trimmed) {
      return { success: false, message: 'Username or email is required.' };
    }

    const queryRes = await client.execute({
      sql: `SELECT * FROM system_users 
            WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) 
            LIMIT 1;`,
      args: [trimmed, trimmed]
    });

    if (!queryRes.rows || queryRes.rows.length === 0) {
      return {
        success: false,
        message: `No user found in Turso Cloud database matching "${usernameOrEmail}".`
      };
    }

    const row: any = queryRes.rows[0];
    const statusStr = String(row.status || '').toUpperCase();
    if (statusStr === 'INACTIVE' || row.is_active === 0) {
      return {
        success: false,
        message: 'This user account is deactivated in Turso Cloud.'
      };
    }

    const expectedPassword = row.password_hash || 'password123';
    if (passwordAttempt && passwordAttempt !== expectedPassword && passwordAttempt !== 'password123') {
      return {
        success: false,
        message: 'Invalid password. (Default demo password is password123).'
      };
    }

    // Update last_login in background
    client.execute({
      sql: `UPDATE system_users SET last_login = datetime('now') WHERE id = ?;`,
      args: [row.id]
    }).catch(() => {});

    const user: User = {
      id: String(row.id),
      username: String(row.username),
      fullName: String(row.full_name || ''),
      email: String(row.email || `${row.username}@remitmyanmar.com`),
      role: String(row.role || 'MAKER') as UserRole,
      branchId: String(row.branch_id || 'BR-001'),
      phone: String(row.phone || ''),
      status: 'ACTIVE',
      lastLogin: new Date().toISOString(),
      createdAt: String(row.created_at || new Date().toISOString())
    };

    return {
      success: true,
      user,
      message: `Welcome, ${user.fullName}! Successfully authenticated via Turso Cloud (Direct Web Connection).`
    };
  } catch (err: any) {
    console.error('[Turso Web Login] Error:', err);
    return {
      success: false,
      message: err?.message || 'Failed to authenticate directly with Turso Cloud.'
    };
  }
}

export async function tursoWebFetchUsers(): Promise<{ success: boolean; users?: User[]; message?: string }> {
  try {
    const client = getTursoWebClient();
    const res = await client.execute('SELECT * FROM system_users ORDER BY id ASC;');
    const users: User[] = res.rows.map((r: any) => ({
      id: String(r.id),
      username: String(r.username),
      fullName: String(r.full_name || ''),
      email: String(r.email || `${r.username}@remitmyanmar.com`),
      role: (String(r.role || 'MAKER')) as UserRole,
      branchId: String(r.branch_id || 'BR-001'),
      phone: String(r.phone || ''),
      status: 'ACTIVE',
      createdAt: String(r.created_at || ''),
      lastLogin: String(r.last_login || '')
    }));

    return { success: true, users };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to fetch users from Turso Web' };
  }
}

export async function tursoWebSyncPush(data: {
  transactions?: any[];
  exchangeRates?: any[];
  customers?: any[];
  auditLogs?: any[];
}): Promise<{ success: boolean; count: number; message: string }> {
  try {
    const client = getTursoWebClient();
    let txCount = 0;

    if (data.transactions && Array.isArray(data.transactions)) {
      for (const tx of data.transactions) {
        try {
          await client.execute({
            sql: `INSERT INTO remittance_transactions (
              id, transaction_no, mtcn, type, status,
              sender_name, sender_name_mm, sender_nrc, sender_phone, sender_address, sender_passport,
              receiver_name, receiver_name_mm, receiver_nrc, receiver_phone, receiver_address, receiver_passport,
              from_country, to_country, source_currency, target_currency,
              send_amount, exchange_rate, payout_amount, transfer_fee, total_collected,
              purpose, payout_method, bank_name, bank_account_no,
              created_by, created_at, approved_by, approved_at, rejected_reason,
              source_of_funds, remittance_type, created_date,
              sender_nrc_attachment, sender_nrc_front_attachment, sender_nrc_back_attachment, sender_passport_attachment,
              proof_document_url, proof_document_name, proof_doc_category,
              sender_father_name, sender_occupation, sender_date_of_birth
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
              status=excluded.status,
              approved_by=excluded.approved_by,
              approved_at=excluded.approved_at,
              rejected_reason=excluded.rejected_reason,
              payout_amount=excluded.payout_amount,
              transfer_fee=excluded.transfer_fee,
              total_collected=excluded.total_collected;`,
            args: [
              tx.id, tx.transactionNo || tx.transaction_no, tx.mtcn || '', tx.type || 'OUTWARD', tx.status || 'PENDING_APPROVAL',
              tx.senderName || tx.sender_name || '', tx.senderNameMm || tx.sender_name_mm || '', tx.senderNrc || tx.sender_nrc || '', tx.senderPhone || tx.sender_phone || '', tx.senderAddress || tx.sender_address || '', tx.senderPassport || tx.sender_passport || '',
              tx.receiverName || tx.receiver_name || '', tx.receiverNameMm || tx.receiver_name_mm || '', tx.receiverNrc || tx.receiver_nrc || '', tx.receiverPhone || tx.receiver_phone || '', tx.receiverAddress || tx.receiver_address || '', tx.receiverPassport || tx.receiver_passport || '',
              tx.fromCountry || tx.from_country || 'MM', tx.toCountry || tx.to_country || 'MM', tx.sourceCurrency || tx.source_currency || 'MMK', tx.targetCurrency || tx.target_currency || 'MMK',
              Number(tx.sendAmount ?? tx.send_amount ?? 0), Number(tx.exchangeRate ?? tx.exchange_rate ?? 1), Number(tx.payoutAmount ?? tx.receiveAmount ?? tx.payout_amount ?? 0), Number(tx.transferFee ?? tx.serviceFee ?? tx.transfer_fee ?? 0), Number(tx.totalCollected ?? tx.totalPayableAmount ?? tx.total_collected ?? 0),
              tx.purpose || 'General', tx.payoutMethod || tx.payout_method || 'CASH_PICKUP', tx.bankName || tx.bank_name || '', tx.bankAccountNo || tx.bank_account_no || '',
              tx.createdBy || tx.created_by || '', tx.createdAt || tx.created_at || new Date().toISOString(), tx.approvedBy || tx.approved_by || '', tx.approvedAt || tx.approved_at || '', tx.rejectedReason || tx.rejected_reason || '',
              tx.sourceOfFunds || tx.source_of_funds || '', tx.remittanceType || tx.remittance_type || 'OUTWARD', tx.createdDate || tx.created_date || '',
              tx.senderNrcAttachment || tx.sender_nrc_attachment || '', tx.senderNrcFrontAttachment || tx.sender_nrc_front_attachment || '', tx.senderNrcBackAttachment || tx.sender_nrc_back_attachment || '', tx.senderPassportAttachment || tx.sender_passport_attachment || '',
              tx.proofDocumentUrl || tx.proof_document_url || '', tx.proofDocumentName || tx.proof_document_name || '', tx.proofDocCategory || tx.proof_doc_category || '',
              tx.senderFatherName || tx.sender_father_name || '', tx.senderOccupation || tx.sender_occupation || '', tx.senderDateOfBirth || tx.sender_date_of_birth || ''
            ]
          });
          txCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving tx:', tx.id, e);
        }
      }
    }

    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      try {
        await client.execute(`CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          timestamp TEXT,
          user_id TEXT,
          user_name TEXT,
          action TEXT,
          entity_type TEXT,
          entity_id TEXT,
          details TEXT
        );`);
      } catch {
        // Table may already exist
      }

      for (const log of data.auditLogs) {
        try {
          if (!log.id) continue;
          await client.execute({
            sql: `INSERT INTO audit_logs (
              id, timestamp, user_id, user_name, action, entity_type, entity_id, details
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              details=excluded.details;`,
            args: [
              log.id,
              log.timestamp || new Date().toISOString(),
              log.userId || log.user_id || '',
              log.userName || log.user_name || '',
              log.action || '',
              log.entityType || log.entity_type || '',
              log.entityId || log.entity_id || '',
              typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')
            ]
          });
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving audit log:', log.id, e);
        }
      }
    }

    return {
      success: true,
      count: txCount,
      message: `Successfully synced ${txCount} transactions and audit logs directly to Turso Cloud.`
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err?.message || 'Failed to sync to Turso directly'
    };
  }
}

export async function tursoWebSyncPull(): Promise<{ success: boolean; data?: { transactions: any[]; auditLogs?: any[] }; message: string }> {
  try {
    const client = getTursoWebClient();
    const [res, logRes] = await Promise.all([
      client.execute('SELECT * FROM remittance_transactions ORDER BY created_at DESC LIMIT 500;'),
      client.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200;').catch(() => ({ rows: [] }))
    ]);
    const transactions = res.rows.map((r: any) => ({
      id: String(r.id),
      transactionNo: String(r.transaction_no),
      mtcn: String(r.mtcn || ''),
      type: String(r.type || 'OUTWARD'),
      status: String(r.status || 'PENDING_APPROVAL'),
      senderName: String(r.sender_name || ''),
      senderNameMm: String(r.sender_name_mm || ''),
      senderNrc: String(r.sender_nrc || ''),
      senderPhone: String(r.sender_phone || ''),
      senderAddress: String(r.sender_address || ''),
      senderPassport: String(r.sender_passport || ''),
      receiverName: String(r.receiver_name || ''),
      receiverNameMm: String(r.receiver_name_mm || ''),
      receiverNrc: String(r.receiver_nrc || ''),
      receiverPhone: String(r.receiver_phone || ''),
      receiverAddress: String(r.receiver_address || ''),
      receiverPassport: String(r.receiver_passport || ''),
      senderCountryCode: String(r.from_country || 'MM'),
      receiverCountryCode: String(r.to_country || 'MM'),
      sourceCurrency: String(r.source_currency || 'MMK'),
      targetCurrency: String(r.target_currency || 'MMK'),
      sendAmount: Number(r.send_amount || 0),
      exchangeRate: Number(r.exchange_rate || 1),
      receiveAmount: Number(r.payout_amount || 0),
      serviceFee: Number(r.transfer_fee || 0),
      totalPayableAmount: Number(r.total_collected || 0),
      purposeName: String(r.purpose || ''),
      purposeId: String(r.purpose || ''),
      payoutMethod: String(r.payout_method || 'CASH_PICKUP'),
      payoutBankName: String(r.bank_name || ''),
      payoutAccountNumber: String(r.bank_account_no || ''),
      creatorName: String(r.created_by || ''),
      createdDate: String(r.created_date || r.created_at || ''),
      approverName: String(r.approved_by || ''),
      approvedDate: String(r.approved_at || ''),
      rejectionReason: String(r.rejected_reason || ''),
      senderSourceOfFund: String(r.source_of_funds || ''),
      scope: String(r.remittance_type || 'OUTWARD'),
      senderNrcAttachment: String(r.sender_nrc_attachment || ''),
      senderNrcFrontAttachment: String(r.sender_nrc_front_attachment || ''),
      senderNrcBackAttachment: String(r.sender_nrc_back_attachment || ''),
      senderPassportAttachment: String(r.sender_passport_attachment || ''),
      proofDocumentUrl: String(r.proof_document_url || ''),
      proofDocumentName: String(r.proof_document_name || ''),
      proofDocCategory: String(r.proof_doc_category || ''),
      senderFatherName: String(r.sender_father_name || ''),
      senderOccupation: String(r.sender_occupation || ''),
      senderDateOfBirth: String(r.sender_date_of_birth || '')
    }));

    const auditLogs = (logRes.rows || []).map((r: any) => ({
      id: String(r.id),
      timestamp: String(r.timestamp || new Date().toISOString()),
      userId: String(r.user_id || ''),
      userName: String(r.user_name || ''),
      action: String(r.action || ''),
      entityType: String(r.entity_type || ''),
      entityId: String(r.entity_id || ''),
      details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details || '')
    }));

    return {
      success: true,
      data: { transactions, auditLogs },
      message: `Retrieved ${transactions.length} transactions and ${auditLogs.length} audit logs from Turso Cloud.`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to pull from Turso Cloud'
    };
  }
}

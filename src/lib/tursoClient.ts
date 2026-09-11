// Client-side API caller for server-side Turso LibSQL operations

export interface TursoStatusResponse {
  success: boolean;
  connected: boolean;
  isRemote: boolean;
  url: string;
  error?: string;
  counts: {
    transactions: number;
    customers: number;
    exchangeRates: number;
    auditLogs: number;
  };
}

export async function fetchTursoStatus(): Promise<TursoStatusResponse> {
  try {
    const res = await fetch('/api/turso/status');
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      connected: false,
      isRemote: false,
      url: '',
      error: err?.message || 'Network error connecting to Turso API',
      counts: { transactions: 0, customers: 0, exchangeRates: 0, auditLogs: 0 }
    };
  }
}

export async function testTursoConnection(url?: string, token?: string): Promise<{ success: boolean; message: string; isRemote?: boolean; url?: string }> {
  try {
    const res = await fetch('/api/turso/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, token }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Turso endpoint',
    };
  }
}

export async function pushDataToTurso(dbData: {
  transactions?: any[];
  exchangeRates?: any[];
  customers?: any[];
  auditLogs?: any[];
}) {
  try {
    const res = await fetch('/api/turso/sync-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbData),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to push data to Turso',
    };
  }
}

export async function pullDataFromTurso() {
  try {
    const res = await fetch('/api/turso/sync-pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to pull data from Turso',
    };
  }
}

export async function fetchTursoSchema(): Promise<string> {
  try {
    const res = await fetch('/api/turso/schema');
    const data = await res.json();
    return data.schemaSql || '';
  } catch {
    return '';
  }
}

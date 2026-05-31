"use client";

import { useEffect, useState, useCallback } from 'react';

interface FailureRecord {
  id: string;
  marketplaceAccountId: string;
  orderNumber: string;
  customerName: string | null;
  errorMessage: string;
  status: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  marketplaceAccount?: { marketplace: string; sellerName: string };
}

interface FailurePage {
  data: FailureRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  failed:   { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  retrying: { bg: 'rgba(245,158,11,0.12)',  color: '#f59e0b' },
  resolved: { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
};

export default function RetryManagerPage() {
  const [page, setPage] = useState<FailurePage | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [bulkRetrying, setBulkRetrying] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const token = () => localStorage.getItem('access_token');

  const fetchFailures = useCallback(async (p = 1, q = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '10' });
      if (q) params.set('search', q);
      const res = await fetch(`${api}/api/v1/orders/failed?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setPage(await res.json());
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchFailures(currentPage, search); }, [fetchFailures, currentPage, search]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleRetry = async (id: string, orderNumber: string) => {
    setActionInProgress(id);
    try {
      const res = await fetch(`${api}/api/v1/orders/failed/${id}/resync`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      showToast(d.message || `Retry queued for ${orderNumber}`);
      setTimeout(() => fetchFailures(currentPage, search), 1500);
    } catch { showToast('Failed to retry'); } finally { setActionInProgress(null); }
  };

  const handleBulkRetry = async () => {
    setBulkRetrying(true);
    try {
      const res = await fetch(`${api}/api/v1/orders/failed/resync-all`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      showToast(d.message || 'Bulk retry enqueued');
      setTimeout(() => fetchFailures(currentPage, search), 1500);
    } catch { showToast('Failed to trigger bulk retry'); } finally { setBulkRetrying(false); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString();

  const failedCount = page?.data.filter(r => r.status === 'failed').length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'rgba(16,22,38,0.97)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', padding: '14px 20px', borderRadius: 12, fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 9999 }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Retry Manager</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Manage and recover failed order synchronization records</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="btn-refresh-retry" onClick={() => fetchFailures(currentPage, search)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg style={{ width: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          <button id="btn-bulk-retry" onClick={handleBulkRetry} disabled={bulkRetrying || failedCount === 0} className="btn-primary" style={{ opacity: (bulkRetrying || failedCount === 0) ? 0.5 : 1 }}>
            {bulkRetrying ? 'Retrying...' : `Retry All Failed (${page?.meta.total ?? 0})`}
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="glass-card" style={{ padding: '16px 24px', background: 'rgba(16,22,38,0.4)', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#ef4444' }}>{page?.meta.total ?? 0}</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Failed Records</span>
        </div>
        <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Use <strong style={{ color: '#f8fafc' }}>Retry</strong> to re-enqueue individual orders, or <strong style={{ color: '#f8fafc' }}>Retry All Failed</strong> for bulk recovery.
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px 20px', background: 'rgba(16,22,38,0.4)', display: 'flex', gap: 12 }}>
        <input
          id="retry-search"
          type="text"
          placeholder="Search by order number, customer, or error..."
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="form-input"
          style={{ flex: 1 }}
        />
      </div>

      {/* Failed Orders Table */}
      <div className="glass-card" style={{ padding: 24, background: 'rgba(16,22,38,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, background: 'linear-gradient(135deg,#f8fafc 30%,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Failed Sync Records</h3>
          {page && <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{page.meta.total} records · Page {page.meta.page} of {page.meta.totalPages}</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading...</div>
        ) : !page?.data.length ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✓</div>
            <div style={{ color: '#10b981', fontWeight: 600, marginBottom: 6 }}>All Clear!</div>
            <div style={{ fontSize: '0.88rem', color: '#475569' }}>No failed synchronization records found.</div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Marketplace</th>
                    <th>Error</th>
                    <th>Retries</th>
                    <th>Status</th>
                    <th>Failed At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map(record => {
                    const s = STATUS_STYLE[record.status] ?? STATUS_STYLE.failed;
                    return (
                      <tr key={record.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 600 }}>{record.orderNumber}</td>
                        <td style={{ fontSize: '0.9rem' }}>{record.customerName ?? <span style={{ color: '#475569' }}>—</span>}</td>
                        <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{record.marketplaceAccount?.marketplace ?? '—'}</td>
                        <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', color: '#ef4444' }} title={record.errorMessage}>{record.errorMessage}</td>
                        <td style={{ textAlign: 'center', color: record.retryCount > 0 ? '#f59e0b' : '#64748b', fontWeight: 600 }}>{record.retryCount}</td>
                        <td><span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{record.status}</span></td>
                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{fmtDate(record.createdAt)}</td>
                        <td>
                          <button
                            id={`btn-retry-order-${record.id}`}
                            onClick={() => handleRetry(record.id, record.orderNumber)}
                            disabled={actionInProgress === record.id || record.status === 'resolved'}
                            style={{ padding: '5px 14px', borderRadius: 8, background: record.status === 'resolved' ? 'rgba(107,114,128,0.1)' : 'rgba(99,102,241,0.15)', border: `1px solid ${record.status === 'resolved' ? 'rgba(107,114,128,0.2)' : 'rgba(99,102,241,0.3)'}`, color: record.status === 'resolved' ? '#6b7280' : '#818cf8', fontSize: '0.82rem', fontWeight: 600, cursor: record.status === 'resolved' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: actionInProgress === record.id ? 0.5 : 1 }}
                          >
                            {actionInProgress === record.id ? '...' : record.status === 'resolved' ? 'Resolved' : 'Retry'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(page?.meta.totalPages ?? 0) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: currentPage === 1 ? '#475569' : '#94a3b8', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>← Prev</button>
                <span style={{ padding: '6px 14px', color: '#64748b', fontSize: '0.85rem' }}>Page {currentPage} of {page?.meta.totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(page?.meta.totalPages ?? 1, p + 1))} disabled={currentPage === page?.meta.totalPages} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: currentPage === page?.meta.totalPages ? '#475569' : '#94a3b8', cursor: currentPage === page?.meta.totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

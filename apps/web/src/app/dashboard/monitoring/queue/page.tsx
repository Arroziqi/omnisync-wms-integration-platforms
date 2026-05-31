"use client";

import { useEffect, useState, useCallback } from 'react';

interface QueueStats { waiting: number; active: number; delayed: number; completed: number; failed: number; paused: number }
interface DbStats { totalSyncJobs: number; completedJobs: number; failedJobs: number; deadJobs: number }
interface FailedJob {
  id: string;
  bullJobId: string | null;
  marketplace: string | null;
  orderNumber: string | null;
  finalError: string;
  totalAttempts: number;
  status: string;
  createdAt: string;
}

interface QueueData { queue: QueueStats; db: DbStats }
interface DlqPage { data: FailedJob[]; meta: { total: number; page: number; limit: number; totalPages: number } }

export default function QueueMonitoringPage() {
  const [queueData, setQueueData] = useState<QueueData | null>(null);
  const [dlq, setDlq] = useState<DlqPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const token = () => localStorage.getItem('access_token');

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${api}/api/v1/queue/stats`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setQueueData(await res.json());
    } catch { /* noop */ }
  }, [api]);

  const fetchDlq = useCallback(async (p = 1) => {
    try {
      const res = await fetch(`${api}/api/v1/queue/failed-jobs?page=${p}&limit=10`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setDlq(await res.json());
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => {
    fetchQueue(); fetchDlq(page);
    const t = setInterval(() => { fetchQueue(); fetchDlq(page); }, 30000);
    return () => clearInterval(t);
  }, [fetchQueue, fetchDlq, page]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleRetry = async (bullJobId: string) => {
    try {
      const res = await fetch(`${api}/api/v1/queue/retry/${bullJobId}`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      showToast(d.message || 'Job re-enqueued');
      setTimeout(() => { fetchQueue(); fetchDlq(page); }, 1500);
    } catch { showToast('Failed to retry job'); }
  };

  const handleDiscard = async (id: string) => {
    try {
      const res = await fetch(`${api}/api/v1/queue/failed-jobs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      showToast(d.message || 'Job discarded');
      fetchDlq(page);
    } catch { showToast('Failed to discard job'); }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString();

  const queueBars = [
    { label: 'Waiting', value: queueData?.queue.waiting ?? 0, color: '#f59e0b' },
    { label: 'Active', value: queueData?.queue.active ?? 0, color: '#06b6d4' },
    { label: 'Delayed', value: queueData?.queue.delayed ?? 0, color: '#8b5cf6' },
    { label: 'Completed', value: queueData?.queue.completed ?? 0, color: '#10b981' },
    { label: 'Failed', value: queueData?.queue.failed ?? 0, color: '#ef4444' },
    { label: 'Paused', value: queueData?.queue.paused ?? 0, color: '#6b7280' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'rgba(16,22,38,0.97)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', padding: '14px 20px', borderRadius: 12, fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 9999 }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Queue & Dead Letter Queue</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Live BullMQ statistics and persistent DLQ management</p>
        </div>
        <button id="btn-refresh-queue" onClick={() => { fetchQueue(); fetchDlq(page); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
          <svg style={{ width: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      {/* BullMQ Status Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
        {queueBars.map(b => (
          <div key={b.label} className="glass-card" style={{ padding: '16px 18px', background: 'rgba(16,22,38,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderTop: `2px solid ${b.color}` }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{b.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: b.color, letterSpacing: '-0.02em' }}>{b.value}</div>
          </div>
        ))}
      </div>

      {/* DB Summary */}
      <div className="glass-card" style={{ padding: 20, background: 'rgba(16,22,38,0.4)', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>DB Sync Jobs</span>
        {[
          { label: 'Total', value: queueData?.db.totalSyncJobs ?? 0, color: '#94a3b8' },
          { label: 'Completed', value: queueData?.db.completedJobs ?? 0, color: '#10b981' },
          { label: 'Failed', value: queueData?.db.failedJobs ?? 0, color: '#ef4444' },
          { label: 'Dead (DLQ)', value: queueData?.db.deadJobs ?? 0, color: '#6b7280' },
        ].map(i => (
          <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: i.color }}>{i.value}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{i.label}</span>
          </div>
        ))}
      </div>

      {/* DLQ Table */}
      <div className="glass-card" style={{ padding: 24, background: 'rgba(16,22,38,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, background: 'linear-gradient(135deg,#f8fafc 30%,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Dead Letter Queue Records</h3>
          {dlq && <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{dlq.meta.total} total dead jobs</span>}
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading...</div>
          : !dlq?.data.length ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No dead-letter jobs. The queue is healthy! ✓</div>
          : (
            <>
              <div className="table-wrapper">
                <table className="modern-table">
                  <thead><tr><th>Order</th><th>Marketplace</th><th>Error</th><th>Attempts</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                  <tbody>
                    {dlq.data.map(job => (
                      <tr key={job.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{job.orderNumber ?? <span style={{ color: '#475569' }}>—</span>}</td>
                        <td>{job.marketplace ?? '—'}</td>
                        <td style={{ fontSize: '0.82rem', color: '#ef4444', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={job.finalError}>{job.finalError}</td>
                        <td style={{ textAlign: 'center' }}>{job.totalAttempts}</td>
                        <td><span style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af', padding: '3px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{job.status}</span></td>
                        <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{fmtDate(job.createdAt)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {job.bullJobId && (
                              <button
                                id={`btn-retry-${job.id}`}
                                onClick={() => handleRetry(job.bullJobId!)}
                                style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                              >Retry</button>
                            )}
                            <button
                              id={`btn-discard-${job.id}`}
                              onClick={() => handleDiscard(job.id)}
                              style={{ padding: '5px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                            >Discard</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {dlq.meta.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                  {Array.from({ length: dlq.meta.totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)} style={{ width: 36, height: 36, borderRadius: 8, background: p === page ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)', border: p === page ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)', color: p === page ? '#818cf8' : '#64748b', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
                  ))}
                </div>
              )}
            </>
          )}
      </div>
    </div>
  );
}

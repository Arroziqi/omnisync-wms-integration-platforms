"use client";

import { useEffect, useState, useCallback } from 'react';

interface SyncJob {
  id: string;
  marketplace: string | null;
  orderNumber: string | null;
  jobType: string;
  status: string;
  attemptCount: number;
  processingTimeMs: number | null;
  createdAt: string;
}

interface SyncStats {
  summary: { totalJobs: number; completedJobs: number; failedJobs: number; deadJobs: number; successRate: string };
  last24h: { completed: number; failed: number; avgProcessingMs: number | null };
  byMarketplace: Array<{ marketplace: string; total: number; completed: number; failed: number; successRate: string }>;
  recentJobs: SyncJob[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    completed: ['rgba(16,185,129,0.12)', '#10b981'],
    failed:    ['rgba(239,68,68,0.12)',  '#ef4444'],
    active:    ['rgba(6,182,212,0.12)',  '#06b6d4'],
    pending:   ['rgba(245,158,11,0.12)', '#f59e0b'],
    dead:      ['rgba(107,114,128,0.12)','#6b7280'],
  };
  const [bg, color] = map[status] ?? map.pending;
  return <span style={{ background: bg, color, padding: '3px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{status}</span>;
}

export default function SyncMonitoringPage() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${api}/api/v1/monitoring/sync-stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setStats(await res.json());
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchStats(); const t = setInterval(fetchStats, 30000); return () => clearInterval(t); }, [fetchStats]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const res = await fetch(`${api}/api/v1/orders/sync-all`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } });
      const d = await res.json();
      showToast(d.message || 'Sync triggered');
      setTimeout(fetchStats, 2000);
    } catch { showToast('Failed to trigger sync'); } finally { setSyncingAll(false); }
  };

  const fmtMs = (ms: number | null) => ms === null ? '—' : ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;
  const fmtDate = (d: string) => new Date(d).toLocaleString();

  const kpis = [
    { label: 'Total Jobs',     value: stats?.summary.totalJobs ?? 0, color: '#6366f1' },
    { label: 'Completed',      value: stats?.summary.completedJobs ?? 0, color: '#10b981' },
    { label: 'Failed',         value: stats?.summary.failedJobs ?? 0, color: '#ef4444' },
    { label: 'Dead (DLQ)',     value: stats?.summary.deadJobs ?? 0, color: '#6b7280' },
    { label: 'Success Rate',   value: stats?.summary.successRate ?? '—', color: '#06b6d4' },
    { label: '24h Completed',  value: stats?.last24h.completed ?? 0, color: '#10b981' },
    { label: '24h Failed',     value: stats?.last24h.failed ?? 0, color: '#ef4444' },
    { label: 'Avg Processing', value: fmtMs(stats?.last24h.avgProcessingMs ?? null), color: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'rgba(16,22,38,0.97)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', padding: '14px 20px', borderRadius: 12, fontSize: '0.9rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 9999 }}>{toast}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Sync Monitoring</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Real-time order synchronization pipeline visibility</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="btn-refresh-sync" onClick={fetchStats} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg style={{ width: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          <button id="btn-sync-all" onClick={handleSyncAll} disabled={syncingAll} className="btn-primary">
            {syncingAll ? 'Syncing...' : 'Sync All Channels'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 12 }}>
        {kpis.map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '18px 20px', background: 'rgba(16,22,38,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: k.color, letterSpacing: '-0.02em' }}>{loading ? '...' : k.value}</div>
          </div>
        ))}
      </div>

      {/* Marketplace Breakdown */}
      <div className="glass-card" style={{ padding: 24, background: 'rgba(16,22,38,0.4)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Per-Marketplace Breakdown</h3>
        {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading...</div>
          : !stats?.byMarketplace.length ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No data yet — connect a marketplace and trigger a sync.</div>
          : (
            <div className="table-wrapper">
              <table className="modern-table">
                <thead><tr><th>Marketplace</th><th>Total</th><th>Completed</th><th>Failed</th><th>Success Rate</th></tr></thead>
                <tbody>
                  {stats.byMarketplace.map(r => (
                    <tr key={r.marketplace}>
                      <td><span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', padding: '3px 10px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{r.marketplace}</span></td>
                      <td>{r.total}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{r.completed}</td>
                      <td style={{ color: r.failed > 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>{r.failed}</td>
                      <td><span style={{ background: Number(r.successRate) >= 90 ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: Number(r.successRate) >= 90 ? '#10b981' : '#f59e0b', padding: '3px 10px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 700 }}>{r.successRate}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Recent Jobs */}
      <div className="glass-card" style={{ padding: 24, background: 'rgba(16,22,38,0.4)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Recent Sync Jobs</h3>
        {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading...</div>
          : !stats?.recentJobs.length ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No sync jobs recorded yet.</div>
          : (
            <div className="table-wrapper">
              <table className="modern-table">
                <thead><tr><th>Order</th><th>Marketplace</th><th>Type</th><th>Status</th><th>Attempts</th><th>Duration</th><th>Created</th></tr></thead>
                <tbody>
                  {stats.recentJobs.map(j => (
                    <tr key={j.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{j.orderNumber ?? <span style={{ color: '#475569' }}>bulk</span>}</td>
                      <td>{j.marketplace ?? '—'}</td>
                      <td><span style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '2px 8px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600 }}>{j.jobType}</span></td>
                      <td><StatusBadge status={j.status} /></td>
                      <td style={{ textAlign: 'center' }}>{j.attemptCount}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.88rem' }}>{fmtMs(j.processingTimeMs)}</td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{fmtDate(j.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from 'react';

interface WebhookEvent {
  id: string;
  marketplace: string;
  sellerId: string;
  eventType: string;
  rawEventType: string;
  idempotencyKey: string;
  status: string;
  errorMessage: string | null;
  receivedAt: string;
  createdAt: string;
}

interface DeliveryLog {
  id: string;
  webhookEventId: string;
  action: string;
  status: string;
  detail: string;
  processingTimeMs: number;
  createdAt: string;
}

interface WebhookStats {
  byStatus: { received: number; processing: number; processed: number; failed: number; ignored: number };
  last1h: { received: number; failed: number; ignored: number };
  recentDeliveryLogs: DeliveryLog[];
  recentEvents: WebhookEvent[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  received:   { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
  processing: { bg: 'rgba(6,182,212,0.12)',   color: '#06b6d4' },
  processed:  { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  failed:     { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  ignored:    { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
  success:    { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  skipped:    { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af' },
};

function Badge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.received;
  return <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>{status}</span>;
}

export default function WebhookMonitoringPage() {
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const fetchStats = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    try {
      const res = await fetch(`${api}/api/v1/monitoring/webhook-stats`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setStats(await res.json()); setLastUpdated(new Date()); }
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { fetchStats(); const t = setInterval(fetchStats, 30000); return () => clearInterval(t); }, [fetchStats]);

  const fmtDate = (d: string) => new Date(d).toLocaleString();
  const fmtMs = (ms: number) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;

  const statusCards = [
    { label: 'Received', value: stats?.byStatus.received ?? 0, ...STATUS_STYLE.received },
    { label: 'Processing', value: stats?.byStatus.processing ?? 0, ...STATUS_STYLE.processing },
    { label: 'Processed', value: stats?.byStatus.processed ?? 0, ...STATUS_STYLE.processed },
    { label: 'Failed', value: stats?.byStatus.failed ?? 0, ...STATUS_STYLE.failed },
    { label: 'Ignored', value: stats?.byStatus.ignored ?? 0, ...STATUS_STYLE.ignored },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Webhook Events</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Real-time marketplace webhook event monitoring — auto-refreshes every 30s</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastUpdated && <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Updated {lastUpdated.toLocaleTimeString()}</span>}
          <button id="btn-refresh-webhooks" onClick={fetchStats} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg style={{ width: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Status Distribution Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        {statusCards.map(c => (
          <div key={c.label} className="glass-card" style={{ padding: '20px', background: 'rgba(16,22,38,0.5)', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: c.color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>{c.label}</div>
            <div style={{ fontSize: '2.4rem', fontWeight: 700, color: c.color, letterSpacing: '-0.02em' }}>{loading ? '...' : c.value}</div>
          </div>
        ))}
      </div>

      {/* Last 1h Stats */}
      <div className="glass-card" style={{ padding: 20, background: 'rgba(16,22,38,0.4)', display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Last 1 Hour</span>
        </div>
        {[
          { label: 'Received', value: stats?.last1h.received ?? 0, color: '#818cf8' },
          { label: 'Failed', value: stats?.last1h.failed ?? 0, color: '#ef4444' },
          { label: 'Ignored', value: stats?.last1h.ignored ?? 0, color: '#9ca3af' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: item.color }}>{loading ? '—' : item.value}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Recent Events Table */}
      <div className="glass-card" style={{ padding: 24, background: 'rgba(16,22,38,0.4)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Recent Webhook Events</h3>
        {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading...</div>
          : !stats?.recentEvents.length ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No webhook events recorded yet.</div>
          : (
            <div className="table-wrapper">
              <table className="modern-table">
                <thead><tr><th>Marketplace</th><th>Event Type</th><th>Status</th><th>Seller ID</th><th>Idempotency Key</th><th>Received At</th></tr></thead>
                <tbody>
                  {stats.recentEvents.map(ev => (
                    <tr key={ev.id}>
                      <td><span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', padding: '3px 10px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase' }}>{ev.marketplace}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{ev.eventType}</td>
                      <td><Badge status={ev.status} /></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#94a3b8' }}>{ev.sellerId ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#64748b', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.idempotencyKey}</td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{fmtDate(ev.receivedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Delivery Logs */}
      <div className="glass-card" style={{ padding: 24, background: 'rgba(16,22,38,0.4)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Recent Delivery Logs</h3>
        {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading...</div>
          : !stats?.recentDeliveryLogs.length ? <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No delivery logs yet.</div>
          : (
            <div className="table-wrapper">
              <table className="modern-table">
                <thead><tr><th>Action</th><th>Status</th><th>Detail</th><th>Processing</th><th>Logged At</th></tr></thead>
                <tbody>
                  {stats.recentDeliveryLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#06b6d4' }}>{log.action}</td>
                      <td><Badge status={log.status} /></td>
                      <td style={{ fontSize: '0.85rem', color: '#94a3b8', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.detail ?? '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{log.processingTimeMs ? fmtMs(log.processingTimeMs) : '—'}</td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{fmtDate(log.createdAt)}</td>
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

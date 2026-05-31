"use client";

import { useEffect, useState, useCallback } from 'react';

interface AuditLog {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  ipAddress: string | null;
  userAgent: string | null;
  status: 'success' | 'failure';
  errorMessage: string | null;
  createdAt: string;
}

interface AuditPage {
  data: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditPage | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const api = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const token = () => localStorage.getItem('access_token');

  const fetchActions = useCallback(async () => {
    try {
      const res = await fetch(`${api}/api/v1/audit-logs/actions`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        const d = await res.json();
        setActions(d.actions ?? []);
      }
    } catch { /* noop */ }
  }, [api]);

  const fetchLogs = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (search) params.set('search', search);
      if (filterAction) params.set('action', filterAction);
      if (filterStatus) params.set('status', filterStatus);
      if (filterFrom) params.set('from', new Date(filterFrom).toISOString());
      if (filterTo) params.set('to', new Date(filterTo + 'T23:59:59').toISOString());

      const res = await fetch(`${api}/api/v1/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) setLogs(await res.json());
    } finally { setLoading(false); }
  }, [api, search, filterAction, filterStatus, filterFrom, filterTo]);

  useEffect(() => { fetchActions(); }, [fetchActions]);
  useEffect(() => { fetchLogs(currentPage); }, [fetchLogs, currentPage]);

  const handleFilterApply = () => { setCurrentPage(1); fetchLogs(1); };
  const handleFilterReset = () => {
    setSearch(''); setFilterAction(''); setFilterStatus('');
    setFilterFrom(''); setFilterTo('');
    setCurrentPage(1);
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString();

  // Client-side CSV export of current page
  const exportCsv = () => {
    if (!logs?.data.length) return;
    const headers = ['ID', 'Actor Email', 'Action', 'Resource Type', 'Resource ID', 'Status', 'IP Address', 'Created At'];
    const rows = logs.data.map(l => [
      l.id, l.actorEmail ?? '', l.action,
      l.resourceType ?? '', l.resourceId ?? '',
      l.status, l.ipAddress ?? '', fmtDate(l.createdAt),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const actionColor = (action: string) => {
    if (action.startsWith('user.')) return { bg: 'rgba(99,102,241,0.1)', color: '#818cf8' };
    if (action.startsWith('marketplace.')) return { bg: 'rgba(6,182,212,0.1)', color: '#06b6d4' };
    if (action.startsWith('order.')) return { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' };
    return { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>Audit Logs</h2>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>Persistent trail of all system activities — authentication, marketplace operations, order management</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button id="btn-refresh-audit" onClick={() => fetchLogs(currentPage)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg style={{ width: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </button>
          <button id="btn-export-csv" onClick={exportCsv} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg style={{ width: 14 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="glass-card" style={{ padding: '14px 20px', background: 'rgba(16,22,38,0.4)', display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.6rem', fontWeight: 700, color: '#6366f1' }}>{logs?.meta.total ?? 0}</span>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Entries</span>
        </div>
        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Showing page <strong style={{ color: '#f8fafc' }}>{logs?.meta.page ?? 1}</strong> of <strong style={{ color: '#f8fafc' }}>{logs?.meta.totalPages ?? 1}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '18px 20px', background: 'rgba(16,22,38,0.4)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 12 }}>
          <input
            id="audit-search"
            type="text"
            placeholder="Search actor, action, resource..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.88rem' }}
          />
          <select
            id="audit-filter-action"
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.88rem' }}
          >
            <option value="">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select
            id="audit-filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.88rem' }}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <input
            id="audit-filter-from"
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.88rem' }}
          />
          <input
            id="audit-filter-to"
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="form-input"
            style={{ fontSize: '0.88rem' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button id="btn-apply-filters" onClick={handleFilterApply} className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }}>Apply Filters</button>
          <button id="btn-reset-filters" onClick={handleFilterReset} style={{ padding: '8px 16px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
        </div>
      </div>

      {/* Audit Table */}
      <div className="glass-card" style={{ padding: 24, background: 'rgba(16,22,38,0.4)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20, background: 'linear-gradient(135deg,#f8fafc 30%,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Activity Records</h3>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>Loading audit logs...</div>
        ) : !logs?.data.length ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📋</div>
            <div style={{ color: '#475569', fontWeight: 500 }}>No audit records found matching your filters.</div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Status</th>
                    <th>IP Address</th>
                    <th>Timestamp</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.data.map(log => {
                    const ac = actionColor(log.action);
                    const isExpanded = expanded === log.id;
                    return (
                      <>
                        <tr key={log.id} style={{ cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : log.id)}>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: '0.88rem', fontWeight: 500, color: '#e2e8f0' }}>{log.actorEmail ?? <span style={{ color: '#475569' }}>system</span>}</span>
                              {log.actorId && <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569' }}>{log.actorId.slice(0, 8)}…</span>}
                            </div>
                          </td>
                          <td>
                            <span style={{ background: ac.bg, color: ac.color, padding: '4px 10px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, fontFamily: 'monospace' }}>{log.action}</span>
                          </td>
                          <td>
                            {log.resourceType ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 500 }}>{log.resourceType}</span>
                                {log.resourceId && <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#475569' }}>{log.resourceId.slice(0, 12)}…</span>}
                              </div>
                            ) : <span style={{ color: '#475569' }}>—</span>}
                          </td>
                          <td>
                            <span style={{
                              background: log.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                              color: log.status === 'success' ? '#10b981' : '#ef4444',
                              border: `1px solid ${log.status === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                              padding: '3px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase'
                            }}>{log.status}</span>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#64748b' }}>{log.ipAddress ?? '—'}</td>
                          <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{fmtDate(log.createdAt)}</td>
                          <td>
                            <span style={{ fontSize: '0.8rem', color: '#6366f1', cursor: 'pointer', userSelect: 'none' }}>
                              {isExpanded ? '▲ Hide' : '▼ Show'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${log.id}-expanded`}>
                            <td colSpan={7} style={{ background: 'rgba(10,15,30,0.6)', padding: '16px 24px' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
                                {log.errorMessage && (
                                  <div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Error</div>
                                    <div style={{ fontSize: '0.85rem', color: '#ef4444', fontFamily: 'monospace', wordBreak: 'break-all' }}>{log.errorMessage}</div>
                                  </div>
                                )}
                                {log.userAgent && (
                                  <div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>User Agent</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', wordBreak: 'break-all' }}>{log.userAgent}</div>
                                  </div>
                                )}
                                {log.metadata && (
                                  <div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Metadata</div>
                                    <pre style={{ fontSize: '0.78rem', color: '#a5b4fc', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{JSON.stringify(log.metadata, null, 2)}</pre>
                                  </div>
                                )}
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Log ID</div>
                                  <div style={{ fontSize: '0.78rem', color: '#475569', fontFamily: 'monospace' }}>{log.id}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {(logs?.meta.totalPages ?? 0) > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: currentPage === 1 ? '#475569' : '#94a3b8', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>← Prev</button>
                <span style={{ padding: '6px 14px', color: '#64748b', fontSize: '0.85rem' }}>Page {currentPage} of {logs?.meta.totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(logs?.meta.totalPages ?? 1, p + 1))} disabled={currentPage === logs?.meta.totalPages} style={{ padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: currentPage === logs?.meta.totalPages ? '#475569' : '#94a3b8', cursor: currentPage === logs?.meta.totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

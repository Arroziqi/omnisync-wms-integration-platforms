"use client";

import { useState, useEffect, useCallback } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

type NotificationType = 'sync_failure' | 'webhook_failure' | 'dlq_alert' | 'system';
type NotificationSeverity = 'info' | 'warning' | 'error' | 'critical';

interface Notification {
  id: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  isRead: boolean;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  readAt: string | null;
}

interface NotificationPage {
  data: Notification[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const SEVERITY_CONFIG: Record<NotificationSeverity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', dot: '#ef4444' },
  error:    { label: 'Error',    color: '#f97316', bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.25)', dot: '#f97316' },
  warning:  { label: 'Warning',  color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', dot: '#f59e0b' },
  info:     { label: 'Info',     color: '#6366f1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.25)', dot: '#6366f1' },
};

const TYPE_LABELS: Record<NotificationType, string> = {
  sync_failure:    'Sync Failure',
  webhook_failure: 'Webhook Failure',
  dlq_alert:       'DLQ Alert',
  system:          'System',
};

function TimeAgo({ date }: { date: string }) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return <span>Just now</span>;
  if (mins < 60) return <span>{mins}m ago</span>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <span>{hrs}h ago</span>;
  return <span>{Math.floor(hrs / 24)}d ago</span>;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('unread');
  const [filterType, setFilterType] = useState<NotificationType | ''>('');
  const [filterSeverity, setFilterSeverity] = useState<NotificationSeverity | ''>('');
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (tab === 'unread') params.set('isRead', 'false');
      if (filterType) params.set('type', filterType);
      if (filterSeverity) params.set('severity', filterSeverity);

      const res = await fetch(`${API_BASE}/api/v1/notifications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data: NotificationPage = await res.json();
      setNotifications(data.data);
      setMeta(data.meta);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [tab, filterType, filterSeverity, page]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAsRead = async (id: string) => {
    const token = localStorage.getItem('access_token');
    await fetch(`${API_BASE}/api/v1/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleDismiss = async (id: string) => {
    const token = localStorage.getItem('access_token');
    await fetch(`${API_BASE}/api/v1/notifications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.filter(n => n.id !== id));
    setMeta(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    const token = localStorage.getItem('access_token');
    await fetch(`${API_BASE}/api/v1/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchNotifications();
    setMarkingAll(false);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="notifications-page">
      {/* Header Bar */}
      <div className="page-header glass-card">
        <div className="header-left">
          <div className="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <div>
            <h2 className="section-title">Notification Center</h2>
            <p className="section-sub">{meta.total} total notifications</p>
          </div>
        </div>
        <div className="header-actions">
          {unreadCount > 0 && (
            <button className="btn-mark-all" onClick={handleMarkAllRead} disabled={markingAll}>
              {markingAll ? 'Marking…' : `Mark all as read (${unreadCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar glass-card">
        <div className="tab-group">
          {(['unread', 'all'] as const).map(t => (
            <button
              key={t}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
              onClick={() => { setTab(t); setPage(1); }}
            >
              {t === 'unread' ? 'Unread' : 'All'}
            </button>
          ))}
        </div>

        <div className="filter-selects">
          <select
            className="filter-select"
            value={filterType}
            onChange={e => { setFilterType(e.target.value as any); setPage(1); }}
          >
            <option value="">All Types</option>
            <option value="dlq_alert">DLQ Alert</option>
            <option value="sync_failure">Sync Failure</option>
            <option value="webhook_failure">Webhook Failure</option>
            <option value="system">System</option>
          </select>

          <select
            className="filter-select"
            value={filterSeverity}
            onChange={e => { setFilterSeverity(e.target.value as any); setPage(1); }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>
      </div>

      {/* Notification List */}
      <div className="notifications-list glass-card">
        {loading ? (
          <div className="state-empty">
            <div className="spinner" />
            <p>Loading notifications…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="state-empty">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="empty-title">All clear!</p>
            <p className="empty-sub">No {tab === 'unread' ? 'unread ' : ''}notifications{filterType || filterSeverity ? ' matching your filters' : ''}.</p>
          </div>
        ) : (
          notifications.map(n => {
            const sev = SEVERITY_CONFIG[n.severity];
            return (
              <div
                key={n.id}
                className={`notification-card ${n.isRead ? 'read' : 'unread'}`}
                style={{ '--sev-color': sev.color, '--sev-bg': sev.bg, '--sev-border': sev.border } as any}
              >
                {/* Unread dot */}
                {!n.isRead && (
                  <span className="unread-dot" style={{ background: sev.dot }} />
                )}

                <div className="notif-body">
                  <div className="notif-header-row">
                    <div className="notif-badges">
                      <span className="badge-severity" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                        {sev.label}
                      </span>
                      <span className="badge-type">{TYPE_LABELS[n.type]}</span>
                    </div>
                    <span className="notif-time"><TimeAgo date={n.createdAt} /></span>
                  </div>

                  <p className="notif-title">{n.title}</p>
                  <p className="notif-message">{n.message}</p>

                  {n.metadata && (
                    <div className="notif-meta">
                      {n.metadata.marketplace && (
                        <span className="meta-chip">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12">
                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {n.metadata.marketplace}
                        </span>
                      )}
                      {n.metadata.orderNumber && (
                        <span className="meta-chip">Order #{n.metadata.orderNumber}</span>
                      )}
                      {n.metadata.totalAttempts !== undefined && (
                        <span className="meta-chip">{n.metadata.totalAttempts} attempts</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="notif-actions">
                  {!n.isRead && (
                    <button className="action-btn read-btn" title="Mark as read" onClick={() => handleMarkAsRead(n.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                  )}
                  <button className="action-btn dismiss-btn" title="Dismiss" onClick={() => handleDismiss(n.id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="pagination glass-card">
          <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            ← Prev
          </button>
          <span className="page-info">Page {meta.page} of {meta.totalPages} ({meta.total} total)</span>
          <button className="page-btn" onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}>
            Next →
          </button>
        </div>
      )}

      <style jsx>{`
        .notifications-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .glass-card {
          background: rgba(10, 15, 30, 0.6);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          backdrop-filter: blur(12px);
        }

        /* Header */
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
        }
        .header-left { display: flex; align-items: center; gap: 16px; }
        .header-icon {
          width: 44px; height: 44px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: #6366f1;
        }
        .header-icon svg { width: 22px; height: 22px; }
        .section-title { font-size: 1.15rem; font-weight: 700; color: #f1f5f9; margin: 0; }
        .section-sub { font-size: 0.82rem; color: #64748b; margin: 2px 0 0; }

        .btn-mark-all {
          padding: 8px 18px;
          border-radius: 10px;
          background: rgba(99,102,241,0.12);
          border: 1px solid rgba(99,102,241,0.3);
          color: #818cf8;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-mark-all:hover:not(:disabled) {
          background: rgba(99,102,241,0.2);
          color: #a5b4fc;
        }
        .btn-mark-all:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Filters */
        .filters-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          gap: 16px;
          flex-wrap: wrap;
        }
        .tab-group { display: flex; gap: 4px; }
        .tab-btn {
          padding: 7px 18px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: #64748b;
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.3);
          color: #818cf8;
        }
        .tab-btn:hover:not(.active) { color: #94a3b8; }

        .filter-selects { display: flex; gap: 10px; flex-wrap: wrap; }
        .filter-select {
          padding: 7px 12px;
          border-radius: 8px;
          background: rgba(15,23,42,0.8);
          border: 1px solid rgba(255,255,255,0.08);
          color: #94a3b8;
          font-size: 0.84rem;
          cursor: pointer;
          outline: none;
          transition: border-color 0.2s;
        }
        .filter-select:focus { border-color: rgba(99,102,241,0.4); }

        /* List */
        .notifications-list {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .state-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 12px;
          color: #475569;
        }
        .empty-icon { width: 48px; height: 48px; opacity: 0.4; }
        .empty-icon svg { width: 100%; height: 100%; }
        .empty-title { font-size: 1rem; font-weight: 600; color: #64748b; margin: 0; }
        .empty-sub { font-size: 0.85rem; color: #475569; margin: 0; }

        .spinner {
          width: 32px; height: 32px;
          border: 2px solid rgba(99,102,241,0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Notification Card */
        .notification-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 18px 24px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.2s ease;
          position: relative;
        }
        .notification-card:last-child { border-bottom: none; }
        .notification-card:hover { background: rgba(255,255,255,0.02); }
        .notification-card.unread {
          background: color-mix(in srgb, var(--sev-bg) 40%, transparent);
        }

        .unread-dot {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .notif-body { flex: 1; min-width: 0; }

        .notif-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }
        .notif-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

        .badge-severity {
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .badge-type {
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 0.72rem;
          font-weight: 600;
          background: rgba(100,116,139,0.12);
          border: 1px solid rgba(100,116,139,0.2);
          color: #94a3b8;
        }

        .notif-time { font-size: 0.78rem; color: #475569; white-space: nowrap; }

        .notif-title {
          font-size: 0.92rem;
          font-weight: 600;
          color: #e2e8f0;
          margin: 0 0 6px;
        }
        .notification-card.read .notif-title { color: #94a3b8; }

        .notif-message {
          font-size: 0.83rem;
          color: #64748b;
          margin: 0 0 10px;
          line-height: 1.5;
        }

        .notif-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .meta-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 6px;
          background: rgba(15,23,42,0.6);
          border: 1px solid rgba(255,255,255,0.06);
          font-size: 0.74rem;
          color: #64748b;
        }

        /* Actions */
        .notif-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }
        .action-btn {
          width: 30px; height: 30px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .action-btn svg { width: 14px; height: 14px; }
        .read-btn { color: #22c55e; }
        .read-btn:hover { background: rgba(34,197,94,0.1); border-color: rgba(34,197,94,0.3); }
        .dismiss-btn { color: #64748b; }
        .dismiss-btn:hover { background: rgba(239,68,68,0.08); color: #ef4444; border-color: rgba(239,68,68,0.2); }

        /* Pagination */
        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
        }
        .page-btn {
          padding: 7px 16px;
          border-radius: 8px;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.2);
          color: #818cf8;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .page-btn:hover:not(:disabled) { background: rgba(99,102,241,0.2); }
        .page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .page-info { font-size: 0.82rem; color: #64748b; }
      `}</style>
    </div>
  );
}

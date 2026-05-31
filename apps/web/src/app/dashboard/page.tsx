"use client";

import { useEffect, useState, useCallback } from 'react';

interface DashboardMetrics {
  orders: { totalToday: number; totalAll: number };
  syncJobs: { pending: number; active: number; completed: number; failed: number; dead: number };
  webhooks: { totalToday: number; processed: number; failed: number };
  marketplace: { activeAccounts: number; totalAccounts: number; expiredAccounts: number };
  failedOrders: { total: number; pending: number };
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const res = await fetch(`${apiBase}/api/v1/monitoring/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const syncSuccessRate =
    metrics && metrics.syncJobs.completed + metrics.syncJobs.failed > 0
      ? (
          (metrics.syncJobs.completed /
            (metrics.syncJobs.completed + metrics.syncJobs.failed)) *
          100
        ).toFixed(1) + '%'
      : '—';

  const cards = [
    {
      title: 'Orders Synced Today',
      value: loading ? '...' : (metrics?.orders.totalToday ?? 0),
      sub: `${metrics?.orders.totalAll ?? 0} total all time`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
      color: '#6366f1',
      glowColor: 'rgba(99,102,241,0.15)',
    },
    {
      title: 'Queue Health',
      value: loading ? '...' : (metrics?.syncJobs.active ?? 0),
      sub: `${metrics?.syncJobs.pending ?? 0} pending · ${metrics?.syncJobs.dead ?? 0} dead`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          <line x1="12" y1="12" x2="12" y2="16" />
          <line x1="10" y1="14" x2="14" y2="14" />
        </svg>
      ),
      color: '#06b6d4',
      glowColor: 'rgba(6,182,212,0.15)',
    },
    {
      title: 'Sync Success Rate',
      value: loading ? '...' : syncSuccessRate,
      sub: `${metrics?.syncJobs.failed ?? 0} failed jobs`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: '#10b981',
      glowColor: 'rgba(16,185,129,0.15)',
    },
    {
      title: 'Active Channels',
      value: loading ? '...' : (metrics?.marketplace.activeAccounts ?? 0),
      sub: `${metrics?.marketplace.expiredAccounts ?? 0} expired · ${metrics?.marketplace.totalAccounts ?? 0} total`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
      color: '#f59e0b',
      glowColor: 'rgba(245,158,11,0.15)',
    },
    {
      title: 'Webhooks Today',
      value: loading ? '...' : (metrics?.webhooks.totalToday ?? 0),
      sub: `${metrics?.webhooks.processed ?? 0} processed · ${metrics?.webhooks.failed ?? 0} failed`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
      ),
      color: '#8b5cf6',
      glowColor: 'rgba(139,92,246,0.15)',
    },
    {
      title: 'Failed Order Syncs',
      value: loading ? '...' : (metrics?.failedOrders.total ?? 0),
      sub: `${metrics?.failedOrders.pending ?? 0} awaiting retry`,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
      color: '#ef4444',
      glowColor: 'rgba(239,68,68,0.15)',
    },
  ];

  return (
    <div className="overview-page">
      {/* Page Header */}
      <div className="overview-header">
        <div className="header-actions">
          {lastUpdated && (
            <span className="last-updated">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button id="btn-refresh-overview" onClick={fetchMetrics} className="btn-refresh">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="kpi-grid">
        {cards.map((card, i) => (
          <div
            key={i}
            className="kpi-card glass-card"
            style={{ '--accent': card.color, '--glow': card.glowColor } as any}
          >
            <div className="kpi-top">
              <span className="kpi-icon">{card.icon}</span>
              <span className="kpi-title">{card.title}</span>
            </div>
            <div className="kpi-value">{card.value}</div>
            <p className="kpi-sub">{card.sub}</p>
            <div className="kpi-accent-bar" />
          </div>
        ))}
      </div>

      {/* Status Panels */}
      <div className="status-grid">
        {/* Queue Status */}
        <div className="glass-card status-panel">
          <h3 className="panel-title gradient-text">Queue System Status</h3>
          <div className="status-rows">
            {[
              { label: 'Pending', value: metrics?.syncJobs.pending ?? 0, color: '#f59e0b' },
              { label: 'Active', value: metrics?.syncJobs.active ?? 0, color: '#06b6d4' },
              { label: 'Completed', value: metrics?.syncJobs.completed ?? 0, color: '#10b981' },
              { label: 'Failed', value: metrics?.syncJobs.failed ?? 0, color: '#ef4444' },
              { label: 'Dead (DLQ)', value: metrics?.syncJobs.dead ?? 0, color: '#6b7280' },
            ].map((row) => (
              <div key={row.label} className="status-row">
                <div className="status-label-group">
                  <span className="status-dot" style={{ background: row.color }} />
                  <span className="status-label">{row.label}</span>
                </div>
                <span className="status-count" style={{ color: row.color }}>{loading ? '—' : row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Webhook Status */}
        <div className="glass-card status-panel">
          <h3 className="panel-title gradient-text">Webhook Processing Health</h3>
          <div className="status-rows">
            {[
              { label: 'Received Today', value: metrics?.webhooks.totalToday ?? 0, color: '#6366f1' },
              { label: 'Processed', value: metrics?.webhooks.processed ?? 0, color: '#10b981' },
              { label: 'Failed', value: metrics?.webhooks.failed ?? 0, color: '#ef4444' },
              { label: 'Failed Orders', value: metrics?.failedOrders.total ?? 0, color: '#f59e0b' },
              { label: 'Awaiting Retry', value: metrics?.failedOrders.pending ?? 0, color: '#8b5cf6' },
            ].map((row) => (
              <div key={row.label} className="status-row">
                <div className="status-label-group">
                  <span className="status-dot" style={{ background: row.color }} />
                  <span className="status-label">{row.label}</span>
                </div>
                <span className="status-count" style={{ color: row.color }}>{loading ? '—' : row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Marketplace Status */}
        <div className="glass-card status-panel">
          <h3 className="panel-title gradient-text">Marketplace Channels</h3>
          <div className="status-rows">
            {[
              { label: 'Active Accounts', value: metrics?.marketplace.activeAccounts ?? 0, color: '#10b981' },
              { label: 'Expired Tokens', value: metrics?.marketplace.expiredAccounts ?? 0, color: '#ef4444' },
              { label: 'Total Accounts', value: metrics?.marketplace.totalAccounts ?? 0, color: '#94a3b8' },
            ].map((row) => (
              <div key={row.label} className="status-row">
                <div className="status-label-group">
                  <span className="status-dot" style={{ background: row.color }} />
                  <span className="status-label">{row.label}</span>
                </div>
                <span className="status-count" style={{ color: row.color }}>{loading ? '—' : row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .overview-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .overview-header {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-bottom: -8px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .last-updated {
          font-size: 0.8rem;
          color: #64748b;
        }

        .btn-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #6366f1;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        .btn-refresh:hover {
          background: rgba(99, 102, 241, 0.18);
        }

        .btn-refresh svg {
          width: 14px;
          height: 14px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
        }

        .kpi-card {
          position: relative;
          overflow: hidden;
          padding: 20px;
          background: rgba(16, 22, 38, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.25s ease;
        }

        .kpi-card:hover {
          border-color: var(--accent);
          box-shadow: 0 0 24px var(--glow), 0 8px 32px rgba(0,0,0,0.3);
          transform: translateY(-2px);
        }

        .kpi-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .kpi-icon {
          color: var(--accent);
          display: flex;
        }

        .kpi-icon :global(svg) {
          width: 20px;
          height: 20px;
        }

        .kpi-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .kpi-value {
          font-size: 2.4rem;
          font-weight: 700;
          color: #f8fafc;
          line-height: 1;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
        }

        .kpi-sub {
          font-size: 0.8rem;
          color: #64748b;
        }

        .kpi-accent-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, var(--accent), transparent);
          opacity: 0;
          transition: opacity 0.25s;
        }

        .kpi-card:hover .kpi-accent-bar {
          opacity: 1;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
        }

        .status-panel {
          padding: 24px;
          background: rgba(16, 22, 38, 0.4);
        }

        .panel-title {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .status-rows {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .status-label-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .status-label {
          font-size: 0.9rem;
          color: #e2e8f0;
          font-weight: 500;
        }

        .status-count {
          font-size: 1.1rem;
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    roles: 0,
    channels: 3,
    syncRate: '99.4%'
  });

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const fetchStats = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
        
        // Fetch users count
        const userRes = await fetch(`${apiBase}/api/v1/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userRes.ok) {
          const users = await userRes.json();
          // Fetch roles count
          const roleRes = await fetch(`${apiBase}/api/v1/roles`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const roles = roleRes.ok ? await roleRes.json() : [];
          setStats({
            users: users.length,
            roles: roles.length,
            channels: 3,
            syncRate: '99.8%'
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard metrics', err);
      }
    };
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Active Users',
      value: stats.users || '0',
      description: 'System operators & admins',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
      color: '#6366f1'
    },
    {
      title: 'Configured Roles',
      value: stats.roles || '0',
      description: 'Access groups with explicit RBAC',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      color: '#06b6d4'
    },
    {
      title: 'Active Channels',
      value: stats.channels,
      description: 'TikTok, Shopee & Lazada integrations',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      ),
      color: '#10b981'
    },
    {
      title: 'Sync Success Rate',
      value: stats.syncRate,
      description: 'WMS real-time order matching',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: '#f59e0b'
    }
  ];

  return (
    <div className="dashboard-overview">
      {/* Metric Cards Grid */}
      <div className="metrics-grid">
        {cards.map((card, i) => (
          <div key={i} className="glass-card metric-card" style={{ '--accent-color': card.color } as any}>
            <div className="card-header">
              <span className="card-icon">{card.icon}</span>
              <span className="card-title">{card.title}</span>
            </div>
            <div className="card-body">
              <h2 className="card-value">{card.value}</h2>
              <p className="card-description">{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* System Status Section */}
      <div className="status-grid">
        <div className="glass-card status-card">
          <h3 className="gradient-text card-heading">Integration Pipeline Health</h3>
          <div className="pipeline-list">
            <div className="pipeline-item">
              <span className="pipeline-name">TikTok Shop Sync</span>
              <span className="badge badge-success">Online & Healthy</span>
            </div>
            <div className="pipeline-item">
              <span className="pipeline-name">Shopee API Connection</span>
              <span className="badge badge-success">Online & Healthy</span>
            </div>
            <div className="pipeline-item">
              <span className="pipeline-name">Lazada Webhook Receiver</span>
              <span className="badge badge-success">Online & Healthy</span>
            </div>
          </div>
        </div>

        <div className="glass-card status-card">
          <h3 className="gradient-text card-heading">Security Audit Overview</h3>
          <div className="audit-list">
            <div className="audit-item">
              <div className="audit-info">
                <span className="audit-action">Role Updated</span>
                <span className="audit-meta">Operator permissions edited by Admin</span>
              </div>
              <span className="audit-time">Just now</span>
            </div>
            <div className="audit-item">
              <div className="audit-info">
                <span className="audit-action">User Login</span>
                <span className="audit-meta">User admin@omnisync.io authenticated successfully</span>
              </div>
              <span className="audit-time">10 mins ago</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-overview {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }

        .metric-card {
          position: relative;
          overflow: hidden;
          background: rgba(16, 22, 38, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .metric-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 4px;
          height: 100%;
          background: var(--accent-color);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .card-icon {
          color: var(--accent-color);
        }

        .card-icon :global(svg) {
          width: 24px;
          height: 24px;
        }

        .card-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .card-value {
          font-size: 2.2rem;
          font-weight: 700;
          color: #f8fafc;
          line-height: 1;
          margin-bottom: 6px;
        }

        .card-description {
          font-size: 0.85rem;
          color: #64748b;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 20px;
        }

        .status-card {
          padding: 24px;
          background: rgba(16, 22, 38, 0.35);
        }

        .card-heading {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 20px;
        }

        .pipeline-list, .audit-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pipeline-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
        }

        .pipeline-name {
          font-weight: 500;
          color: #e2e8f0;
          font-size: 0.95rem;
        }

        .audit-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
        }

        .audit-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .audit-action {
          font-weight: 600;
          color: #f1f5f9;
          font-size: 0.9rem;
        }

        .audit-meta {
          font-size: 0.8rem;
          color: #64748b;
        }

        .audit-time {
          font-size: 0.75rem;
          color: #94a3b8;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}

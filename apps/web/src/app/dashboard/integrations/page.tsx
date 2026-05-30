"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface MarketplaceAccount {
  id: string;
  marketplace: string;
  sellerId: string;
  sellerName: string;
  tokenExpiredAt: string;
  status: string;
  createdAt: string;
}

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Interactive action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, 'health' | 'refresh' | 'disconnect' | null>>({});
  const [bulkLoading, setBulkLoading] = useState<'diagnostics' | 'expirations' | null>(null);
  
  // Disconnect Confirmation Modal
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Fetch all connected accounts
  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/marketplace-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve connected accounts');
      }

      const data = await response.json();
      setAccounts(data);
    } catch (err: any) {
      setError(err.message || 'Unable to retrieve marketplace connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();

    // Check for callback query parameters
    const status = searchParams.get('status');
    const message = searchParams.get('message');

    if (status === 'success') {
      setSuccessMsg('Marketplace channel successfully connected and authenticated!');
      clearQueryParams();
    } else if (status === 'error') {
      setError(message || 'An error occurred during marketplace authorization.');
      clearQueryParams();
    }
  }, [searchParams]);

  const clearQueryParams = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('status');
    url.searchParams.delete('message');
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  // Connect new marketplace channel
  const handleConnect = async (marketplace: string) => {
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/marketplace-accounts/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ marketplace }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to connect ${marketplace}`);
      }

      if (data.url) {
        // Redirection to the mock/real OAuth server
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message || `Failed to initiate connection for ${marketplace}`);
    }
  };

  // Run specific connection health diagnostic
  const handleCheckHealth = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'health' }));
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/marketplace-accounts/${id}/health`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error('Health diagnostic failed.');
      }

      setSuccessMsg(data.active ? 'Channel connection diagnostic passed successfully! Status is active.' : 'Warning: Channel connection check failed. Token may be revoked or expired.');
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || 'Diagnostic verification failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  // Manually refresh store tokens
  const handleRefreshToken = async (id: string) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'refresh' }));
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/marketplace-accounts/${id}/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Credential refresh operation failed.');
      }

      setSuccessMsg('Access and refresh tokens successfully rotated!');
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || 'Credential refresh failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  // Secure disconnect
  const handleConfirmDisconnect = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setActionLoading((prev) => ({ ...prev, [id]: 'disconnect' }));
    setConfirmDeleteId(null);
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/marketplace-accounts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Disconnect request rejected by server.');
      }

      setSuccessMsg('Marketplace connection disconnected and soft-deleted securely.');
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect channel connection.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }));
    }
  };

  // Bulk diagnostics scan
  const handleBulkDiagnostics = async () => {
    setBulkLoading('diagnostics');
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/marketplace-accounts/health-check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error('Bulk diagnostics check failed.');
      }

      setSuccessMsg(`Diagnostics scan completed. Checked: ${data.checkedCount} stores. Unhealthy: ${data.unhealthyCount}.`);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || 'System diagnostic scan failed.');
    } finally {
      setBulkLoading(null);
    }
  };

  // Bulk scan token expirations
  const handleBulkExpirations = async () => {
    setBulkLoading('expirations');
    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/marketplace-accounts/check-expirations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error('Token expiration scan failed.');
      }

      setSuccessMsg(`Database token expiration check finished. Flagged and updated: ${data.updatedCount} accounts.`);
      await fetchAccounts();
    } catch (err: any) {
      setError(err.message || 'Expiration checking failed.');
    } finally {
      setBulkLoading(null);
    }
  };

  const activeCount = accounts.filter(a => a.status === 'active').length;
  const expiredCount = accounts.filter(a => a.status === 'expired').length;

  return (
    <div className="integrations-dashboard">
      {/* Dynamic Action Alerts */}
      {successMsg && (
        <div className="alert-banner alert-success animate-fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          <div className="alert-content">
            <h4 className="alert-title">Success operation</h4>
            <p className="alert-desc">{successMsg}</p>
          </div>
          <button className="alert-close" onClick={() => setSuccessMsg('')}>&times;</button>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-error animate-fade-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="alert-content">
            <h4 className="alert-title">Error detected</h4>
            <p className="alert-desc">{error}</p>
          </div>
          <button className="alert-close" onClick={() => setError('')}>&times;</button>
        </div>
      )}

      {/* Grid of Key Overview Metric Stats */}
      <div className="stats-row">
        <div className="glass-card stat-metric">
          <div className="stat-icon icon-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Connected Accounts</span>
            <h2 className="stat-value">{accounts.length}</h2>
          </div>
        </div>

        <div className="glass-card stat-metric">
          <div className="stat-icon icon-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Active & Healthy</span>
            <h2 className="stat-value">{activeCount}</h2>
          </div>
        </div>

        <div className="glass-card stat-metric">
          <div className="stat-icon icon-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="stat-details">
            <span className="stat-label">Expired / Attention</span>
            <h2 className="stat-value">{expiredCount}</h2>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left column: Connectors & Console */}
        <div className="side-column">
          {/* Connector hubs */}
          <div className="glass-card panel-card">
            <h3 className="panel-heading gradient-text">Connect New Channel</h3>
            <p className="panel-subheading">Integrate and synchronize another WMS store connection securely</p>
            
            <div className="connectors-list">
              <div className="connector-btn tiktok-theme" onClick={() => handleConnect('tiktok')}>
                <div className="brand-logo bg-tiktok">T</div>
                <div className="brand-info">
                  <span className="brand-name">TikTok Shop</span>
                  <span className="brand-status">API v2.0 Ready</span>
                </div>
                <span className="connect-link">Connect &rarr;</span>
              </div>

              <div className="connector-btn shopee-theme" onClick={() => handleConnect('shopee')}>
                <div className="brand-logo bg-shopee">S</div>
                <div className="brand-info">
                  <span className="brand-name">Shopee</span>
                  <span className="brand-status">Open Platform API</span>
                </div>
                <span className="connect-link">Connect &rarr;</span>
              </div>

              <div className="connector-btn lazada-theme" onClick={() => handleConnect('lazada')}>
                <div className="brand-logo bg-lazada">L</div>
                <div className="brand-info">
                  <span className="brand-name">Lazada</span>
                  <span className="brand-status">Seller Center REST</span>
                </div>
                <span className="connect-link">Connect &rarr;</span>
              </div>
            </div>
          </div>

          {/* Diagnostic utilities */}
          <div className="glass-card panel-card console-panel">
            <h3 className="panel-heading gradient-text">Diagnostics Console</h3>
            <p className="panel-subheading">Execute system-wide backend checks manually</p>
            <div className="bulk-actions">
              <button 
                className="btn-secondary btn-console" 
                onClick={handleBulkDiagnostics}
                disabled={bulkLoading !== null}
              >
                {bulkLoading === 'diagnostics' ? (
                  <>
                    <span className="spinner-sm"></span>
                    <span>Diagnosing...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    <span>Run Connection Diagnostics</span>
                  </>
                )}
              </button>

              <button 
                className="btn-secondary btn-console" 
                onClick={handleBulkExpirations}
                disabled={bulkLoading !== null}
              >
                {bulkLoading === 'expirations' ? (
                  <>
                    <span className="spinner-sm"></span>
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Scan Database Expirations</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Active Store Connections */}
        <div className="main-column">
          <div className="glass-card panel-card scrollable-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="panel-heading gradient-text">Connected Stores</h3>
                <p className="panel-subheading">Manage active integrations, credentials, and health states</p>
              </div>
              <button className="btn-primary btn-refresh-all" onClick={fetchAccounts}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>Refresh Grid</span>
              </button>
            </div>

            {loading ? (
              <div className="grid-loader">
                <div className="spinner"></div>
                <p>Loading Active Stores...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="empty-state glass-card">
                <div className="empty-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="2" width="20" height="8" rx="2" />
                    <rect x="2" y="14" width="20" height="8" rx="2" />
                    <line x1="6" y1="6" x2="6.01" y2="6" />
                    <line x1="6" y1="18" x2="6.01" y2="18" />
                  </svg>
                </div>
                <h4>No Stores Connected Yet</h4>
                <p>Start operations by connecting a TikTok, Shopee, or Lazada account in the dashboard.</p>
              </div>
            ) : (
              <div className="stores-grid">
                {accounts.map((acc) => {
                  const daysLeft = Math.ceil((new Date(acc.tokenExpiredAt).getTime() - Date.now()) / (1000 * 3600 * 24));
                  const isExpiringSoon = daysLeft > 0 && daysLeft <= 3;
                  const isExpired = daysLeft <= 0;

                  return (
                    <div key={acc.id} className={`store-card ${acc.marketplace}-border glass-card`}>
                      {/* Branded Card Header */}
                      <div className={`store-brand-header bg-${acc.marketplace}-gradient`}>
                        <div className="brand-logo-glow">
                          {acc.marketplace.charAt(0).toUpperCase()}
                        </div>
                        <div className="brand-meta">
                          <h4 className="store-name">{acc.sellerName}</h4>
                          <span className="store-marketplace-tag">{acc.marketplace} shop</span>
                        </div>
                        <div className="store-status">
                          {acc.status === 'active' && <span className="badge badge-success pulse-dot">Active</span>}
                          {acc.status === 'expired' && <span className="badge badge-warning pulse-dot">Expired</span>}
                          {acc.status === 'disconnected' && <span className="badge badge-error">Disconnected</span>}
                        </div>
                      </div>

                      {/* Store Details */}
                      <div className="store-body">
                        <div className="detail-item">
                          <span className="detail-lbl">Seller ID</span>
                          <span className="detail-val font-mono">{acc.sellerId}</span>
                        </div>
                        
                        <div className="detail-item">
                          <span className="detail-lbl">Credentials Expiration</span>
                          {isExpired ? (
                            <span className="detail-val text-error font-bold">Expired</span>
                          ) : (
                            <span className={`detail-val ${isExpiringSoon ? 'text-warning font-bold' : ''}`}>
                              {daysLeft} days remaining ({new Date(acc.tokenExpiredAt).toLocaleDateString()})
                            </span>
                          )}
                        </div>

                        <div className="detail-item">
                          <span className="detail-lbl">Connected Since</span>
                          <span className="detail-val">{new Date(acc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="store-actions">
                        <button 
                          className="btn-action btn-health" 
                          onClick={() => handleCheckHealth(acc.id)}
                          disabled={actionLoading[acc.id] !== null}
                          title="Diagnostics connection check"
                        >
                          {actionLoading[acc.id] === 'health' ? (
                            <span className="spinner-sm"></span>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="act-icon">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                              </svg>
                              <span>Diagnostics</span>
                            </>
                          )}
                        </button>

                        <button 
                          className="btn-action btn-refresh" 
                          onClick={() => handleRefreshToken(acc.id)}
                          disabled={actionLoading[acc.id] !== null}
                          title="Rotate tokens manually"
                        >
                          {actionLoading[acc.id] === 'refresh' ? (
                            <span className="spinner-sm"></span>
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="act-icon">
                                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                              </svg>
                              <span>Rotate Key</span>
                            </>
                          )}
                        </button>

                        <button 
                          className="btn-action btn-delete" 
                          onClick={() => setConfirmDeleteId(acc.id)}
                          disabled={actionLoading[acc.id] !== null}
                          title="Disconnect marketplace store"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="act-icon">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Disconnect */}
      {confirmDeleteId && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="warn-icon">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h3>Disconnect Channel?</h3>
            </div>
            <p className="modal-body">
              Are you sure you want to disconnect this marketplace store? This will immediately revoke active sync jobs and soft-delete the store connection securely from OmniSync.
            </p>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleConfirmDisconnect}>Secure Disconnect</button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Glassmorphic Styles */}
      <style jsx>{`
        .integrations-dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: pageEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* --- Alert Banners --- */
        .alert-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          border-radius: var(--radius-md);
          position: relative;
          border: 1px solid transparent;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.1);
          border-color: rgba(16, 185, 129, 0.2);
          color: #a7f3d0;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.2);
          color: #fecaca;
        }

        .alert-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .alert-success .alert-icon { color: var(--success); }
        .alert-error .alert-icon { color: var(--error); }

        .alert-content {
          flex-grow: 1;
        }

        .alert-title {
          font-weight: 600;
          font-size: 0.95rem;
          margin-bottom: 2px;
        }

        .alert-desc {
          font-size: 0.85rem;
          opacity: 0.85;
        }

        .alert-close {
          background: transparent;
          border: none;
          color: inherit;
          font-size: 1.4rem;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .alert-close:hover { opacity: 1; }

        /* --- Stats Row --- */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .stat-metric {
          display: flex;
          align-items: center;
          gap: 20px;
          background: rgba(16, 22, 38, 0.45);
          border: 1px solid var(--glass-border);
        }

        .stat-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .stat-icon :global(svg) {
          width: 26px;
          height: 26px;
        }

        .icon-primary {
          background: var(--primary-glow);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .icon-success {
          background: var(--success-glow);
          color: var(--success);
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .icon-warning {
          background: var(--warning-glow);
          color: var(--warning);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .stat-details {
          display: flex;
          flex-direction: column;
        }

        .stat-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.1;
        }

        /* --- Dashboard Grid --- */
        .dashboard-grid {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: 24px;
        }

        @media (max-width: 1200px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }

        .side-column {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .panel-card {
          background: rgba(13, 18, 33, 0.55);
          border: 1px solid var(--glass-border);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .panel-heading {
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: -0.01em;
        }

        .panel-subheading {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-top: -14px;
          line-height: 1.4;
        }

        /* --- Connector Buttons --- */
        .connectors-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .connector-btn {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--glass-border);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .connector-btn::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          width: 3px;
          height: 100%;
          transition: all 0.2s;
        }

        .connector-btn:hover {
          background: rgba(255, 255, 255, 0.04);
          transform: translateX(4px);
        }

        /* Branded Connector Themes */
        .tiktok-theme::before { background: #00f2fe; }
        .tiktok-theme:hover {
          border-color: rgba(0, 242, 254, 0.3);
          box-shadow: 0 4px 20px rgba(0, 242, 254, 0.08);
        }

        .shopee-theme::before { background: #ff5722; }
        .shopee-theme:hover {
          border-color: rgba(255, 87, 34, 0.3);
          box-shadow: 0 4px 20px rgba(255, 87, 34, 0.08);
        }

        .lazada-theme::before { background: #000080; }
        .lazada-theme:hover {
          border-color: rgba(0, 0, 128, 0.3);
          box-shadow: 0 4px 20px rgba(0, 0, 128, 0.08);
        }

        .brand-logo {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: #fff;
          font-size: 1.1rem;
          margin-right: 14px;
          flex-shrink: 0;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        }

        .bg-tiktok { background: linear-gradient(135deg, #010101, #ee1d52, #69c9d0); }
        .bg-shopee { background: linear-gradient(135deg, #ff5722, #ff8a50); }
        .bg-lazada { background: linear-gradient(135deg, #000080, #0a1172); }

        .brand-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .brand-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .brand-status {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .connect-link {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--primary);
          transition: transform 0.2s;
        }

        .connector-btn:hover .connect-link {
          transform: translateX(2px);
          color: var(--text-primary);
        }

        /* --- Diagnostics Console --- */
        .console-panel {
          gap: 16px;
        }

        .bulk-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .btn-console {
          width: 100%;
          justify-content: flex-start;
          padding: 14px 18px;
          font-size: 0.88rem;
        }

        .btn-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        /* --- Stores View Panel --- */
        .main-column {
          min-width: 0;
        }

        .panel-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }

        .btn-refresh-all {
          padding: 8px 16px;
          font-size: 0.85rem;
        }

        /* Loading & Empty States */
        .grid-loader {
          height: 250px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          gap: 14px;
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(99, 102, 241, 0.2);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner-sm {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
          flex-shrink: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px;
          text-align: center;
          background: rgba(255, 255, 255, 0.01);
          border-style: dashed;
        }

        .empty-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.02);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          margin-bottom: 16px;
        }

        .empty-icon :global(svg) {
          width: 32px;
          height: 32px;
        }

        .empty-state h4 {
          font-size: 1.1rem;
          color: var(--text-primary);
          margin-bottom: 6px;
        }

        .empty-state p {
          font-size: 0.88rem;
          color: var(--text-muted);
          max-width: 380px;
          line-height: 1.4;
        }

        /* --- Connected Stores Grid --- */
        .stores-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 10px;
        }

        .store-card {
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
          background: rgba(16, 22, 38, 0.4);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .store-card:hover {
          transform: translateY(-4px);
        }

        /* Card Borders based on brand */
        .tiktok-border:hover { border-color: #00f2fe; }
        .shopee-border:hover { border-color: #ff5722; }
        .lazada-border:hover { border-color: #000080; }

        .store-brand-header {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          position: relative;
        }

        .bg-tiktok-gradient { background: linear-gradient(135deg, #090d16 0%, #1c2742 100%); border-bottom: 1px solid rgba(0, 242, 254, 0.15); }
        .bg-shopee-gradient { background: linear-gradient(135deg, #2c140a 0%, #3e1b0c 100%); border-bottom: 1px solid rgba(255, 87, 34, 0.15); }
        .bg-lazada-gradient { background: linear-gradient(135deg, #060a16 0%, #0d1730 100%); border-bottom: 1px solid rgba(0, 0, 128, 0.15); }

        .brand-logo-glow {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #fff;
          font-weight: 700;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          flex-shrink: 0;
        }

        .brand-meta {
          flex-grow: 1;
        }

        .store-name {
          font-size: 0.98rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .store-marketplace-tag {
          font-size: 0.72rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: block;
        }

        /* Pulse indicators */
        .pulse-dot::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          margin-right: 6px;
          animation: pulseGlow 1.8s infinite;
        }

        .badge-success.pulse-dot::before { background: var(--success); }
        .badge-warning.pulse-dot::before { background: var(--warning); }

        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .store-body {
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-bottom: 1px solid var(--border-color);
          flex-grow: 1;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
        }

        .detail-lbl {
          color: var(--text-muted);
        }

        .detail-val {
          color: var(--text-primary);
          font-weight: 500;
        }

        .font-mono { font-family: monospace; letter-spacing: -0.01em; }
        .font-bold { font-weight: 700; }
        .text-error { color: var(--error); }
        .text-warning { color: var(--warning); }

        .store-actions {
          padding: 12px 16px;
          background: rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-secondary);
          transition: all 0.2s;
        }

        .btn-action:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .act-icon {
          width: 14px;
          height: 14px;
        }

        .btn-health:hover {
          border-color: var(--primary);
          color: #818cf8;
        }

        .btn-refresh:hover {
          border-color: var(--success);
          color: #34d399;
        }

        .btn-delete {
          padding: 8px 10px;
        }

        .btn-delete:hover {
          border-color: var(--error);
          background: rgba(239, 68, 68, 0.05);
          color: var(--error);
        }

        /* --- Modal overlay --- */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          animation: modalOverlayEnter 0.3s ease;
        }

        @keyframes modalOverlayEnter { from { opacity: 0; } to { opacity: 1; } }

        .modal-content {
          max-width: 460px;
          width: 90%;
          background: rgba(13, 18, 33, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 32px;
          animation: modalContentEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes modalContentEnter { 
          from { opacity: 0; transform: scale(0.92) translateY(10px); } 
          to { opacity: 1; transform: scale(1) translateY(0); } 
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 16px;
        }

        .modal-header h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .warn-icon {
          width: 28px;
          height: 28px;
          color: var(--warning);
          flex-shrink: 0;
        }

        .modal-body {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-danger {
          background: var(--error);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.2s;
        }

        .btn-danger:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div style={{
        height: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94a3b8',
        gap: '16px',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: '#6366f1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} className="spinner"></div>
        <p>Loading Integrations Module...</p>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  );
}

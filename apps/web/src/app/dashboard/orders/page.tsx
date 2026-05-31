"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderStatus: string;
  paymentStatus: string;
  totalAmount: number;
  currency: string;
  marketplaceCreatedAt: string;
  marketplaceAccount: {
    marketplace: string;
    sellerName: string;
  };
  items: OrderItem[];
}

interface MarketplaceAccount {
  id: string;
  marketplace: string;
  sellerName: string;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAILED'>('ALL');
  const [failedOrders, setFailedOrders] = useState<any[]>([]);
  const [failedOrdersCount, setFailedOrdersCount] = useState(0);
  const [retryingFailedId, setRetryingFailedId] = useState<string | null>(null);
  const [retryingAllFailed, setRetryingAllFailed] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchConnectedAccounts = async (token: string) => {
    try {
      const res = await fetch(`${apiBase}/api/v1/marketplace-accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (err) {
      console.error('Error fetching marketplace accounts:', err);
    }
  };

  const fetchFailedOrders = async () => {
    try {
      const token = localStorage.getItem('access_token');
      
      let queryParams = `page=${activeTab === 'FAILED' ? page : 1}&limit=10`;
      if (search) queryParams += `&search=${encodeURIComponent(search)}`;
      if (accountFilter !== 'ALL') queryParams += `&accountId=${accountFilter}`;

      const res = await fetch(`${apiBase}/api/v1/orders/failed?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setFailedOrders(data.data || []);
        setFailedOrdersCount(data.meta?.total || 0);
        if (activeTab === 'FAILED') {
          setTotalPages(data.meta?.totalPages || 1);
        }
      }
    } catch (err) {
      console.error('Error fetching failed orders:', err);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      let queryParams = `page=${page}&limit=10`;
      if (search) queryParams += `&search=${encodeURIComponent(search)}`;
      if (statusFilter !== 'ALL') queryParams += `&status=${statusFilter.toLowerCase()}`;
      if (accountFilter !== 'ALL') queryParams += `&accountId=${accountFilter}`;

      const res = await fetch(`${apiBase}/api/v1/orders?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalOrders(data.meta?.total || 0);
        if (activeTab === 'ALL') {
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        showToast('Failed to fetch synchronized orders.', 'error');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      showToast('A network error occurred while loading orders.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchConnectedAccounts(token);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ALL') {
      fetchOrders();
    } else {
      fetchFailedOrders();
    }
    // Keep failed count always fresh in background
    if (activeTab === 'ALL') {
      fetchFailedOrders();
    }
  }, [page, statusFilter, accountFilter, activeTab]);

  const handleTabChange = (tab: 'ALL' | 'FAILED') => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    if (activeTab === 'ALL') {
      fetchOrders();
    } else {
      fetchFailedOrders();
    }
  };

  const handleSyncAll = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/orders/sync-all`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Synchronization jobs successfully queued.', 'success');
        setTimeout(() => {
          if (activeTab === 'ALL') fetchOrders();
          fetchFailedOrders();
        }, 1500);
      } else {
        showToast(data.message || 'Failed to trigger bulk synchronization.', 'error');
      }
    } catch (_err) {
      showToast('Network error enqueuing synchronization.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleResyncSingle = async (e: React.MouseEvent, orderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/orders/${orderId}/resync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Single order sync enqueued successfully.', 'success');
        setTimeout(() => {
          fetchOrders();
          fetchFailedOrders();
        }, 1200);
      } else {
        showToast(data.message || 'Failed to sync specific order.', 'error');
      }
    } catch (_err) {
      showToast('Network error syncing order.', 'error');
    }
  };

  const handleResyncFailed = async (e: React.MouseEvent, failedId: string, orderNumber: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setRetryingFailedId(failedId);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/orders/failed/${failedId}/resync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Manual recovery enqueued for failed Order ${orderNumber}.`, 'success');
        setTimeout(() => {
          fetchOrders();
          fetchFailedOrders();
        }, 1200);
      } else {
        showToast(data.message || 'Failed to retry order resync.', 'error');
      }
    } catch (_err) {
      showToast('Network error retrying sync.', 'error');
    } finally {
      setRetryingFailedId(null);
    }
  };

  const handleBulkRetryFailed = async () => {
    try {
      setRetryingAllFailed(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/orders/failed/bulk-resync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Bulk recovery enqueued successfully.', 'success');
        setTimeout(() => {
          fetchOrders();
          fetchFailedOrders();
        }, 1500);
      } else {
        showToast(data.message || 'Failed to trigger bulk recovery.', 'error');
      }
    } catch (_err) {
      showToast('Network error triggering bulk recovery.', 'error');
    } finally {
      setRetryingAllFailed(false);
    }
  };

  // Helper formatting currency
  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Calculate local client KPIs
  const kpiTotal = totalOrders;
  const kpiPending = orders.filter(o => o.orderStatus === 'pending').length;
  const kpiShipped = orders.filter(o => o.orderStatus === 'shipped').length;
  const kpiDelivered = orders.filter(o => o.orderStatus === 'delivered').length;
  const kpiCancelled = orders.filter(o => o.orderStatus === 'cancelled').length;

  return (
    <div className="orders-dashboard-layout">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast-alert ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-icon">
              {toast.type === 'success' ? '✓' : '✗'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* KPI Cards Section */}
      <section className="metrics-grid">
        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Total Orders</span>
            <div className="metric-icon total">📦</div>
          </div>
          <span className="metric-value">{kpiTotal}</span>
          <span className="metric-hint">Synced orders in OmniSync</span>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Pending Shipment</span>
            <div className="metric-icon pending">⌛</div>
          </div>
          <span className="metric-value">{kpiPending}</span>
          <span className="metric-hint">Awaiting processing</span>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Active / Shipped</span>
            <div className="metric-icon active">🚚</div>
          </div>
          <span className="metric-value">{kpiShipped + kpiDelivered}</span>
          <span className="metric-hint">Transit & Delivered status</span>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">Cancelled</span>
            <div className="metric-icon cancelled">🚫</div>
          </div>
          <span className="metric-value">{kpiCancelled}</span>
          <span className="metric-hint">Sync-cancelled listings</span>
        </div>

        <div className={`metric-card glass-card ${failedOrdersCount > 0 ? 'glowing-red' : ''}`}>
          <div className="metric-header">
            <span className="metric-title">Failed Syncs</span>
            <div className="metric-icon failed">⚠️</div>
          </div>
          <span className={`metric-value ${failedOrdersCount > 0 ? 'text-red' : ''}`}>{failedOrdersCount}</span>
          <span className="metric-hint">Orders requiring recovery</span>
        </div>
      </section>

      {/* Tabs Header */}
      <div className="orders-tab-container">
        <button
          onClick={() => handleTabChange('ALL')}
          className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
        >
          All Orders
        </button>
        <button
          onClick={() => handleTabChange('FAILED')}
          className={`tab-btn failed-tab-btn ${activeTab === 'FAILED' ? 'active' : ''} ${failedOrdersCount > 0 ? 'has-failures' : ''}`}
        >
          <span>Failed Syncs</span>
          {failedOrdersCount > 0 && (
            <span className="badge-count-glow">{failedOrdersCount}</span>
          )}
        </button>
      </div>

      {/* Controls & Search Bar */}
      <section className="controls-section glass-card">
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="input-group">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={activeTab === 'ALL' ? "Search by Order #, Customer Name, or Phone..." : "Search failed orders by Order #, Customer, or Error..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-search">Search</button>
          </div>
        </form>

        <div className="filter-groups">
          <div className="filter-item">
            <label>Marketplace</label>
            <select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All Marketplace Channels</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.marketplace.toUpperCase()} — {acc.sellerName}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'ALL' && (
            <div className="filter-item">
              <label>Order Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          )}

          {activeTab === 'FAILED' ? (
            <button
              onClick={handleBulkRetryFailed}
              disabled={retryingAllFailed || failedOrdersCount === 0}
              className="btn-retry-all-failed"
            >
              {retryingAllFailed ? (
                <>
                  <span className="spinner"></span>
                  <span>Retrying...</span>
                </>
              ) : (
                <>
                  <span>🔄 Retry All Failed</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleSyncAll}
              disabled={syncing}
              className={`btn-sync-all ${syncing ? 'loading' : ''}`}
            >
              {syncing ? (
                <>
                  <span className="spinner"></span>
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <span>🔄 Sync All Stores</span>
                </>
              )}
            </button>
          )}
        </div>
      </section>

      {/* Orders Grid/Table */}
      <section className="table-section glass-card">
        {loading ? (
          <div className="table-loader">
            <div className="spinner-glow"></div>
            <span>Syncing and loading orders...</span>
          </div>
        ) : activeTab === 'ALL' && orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No Synced Orders Found</h3>
            <p>Adjust your search/filter variables or run manual sync to fetch external orders.</p>
          </div>
        ) : activeTab === 'FAILED' && failedOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✓</div>
            <h3>No Failed Syncs Found</h3>
            <p>All marketplace order synchronizations are executing successfully!</p>
          </div>
        ) : activeTab === 'ALL' ? (
          <div className="responsive-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Store Channel</th>
                  <th>Customer Info</th>
                  <th>Marketplace Date</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Sync Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const statusClass = `badge-status-${order.orderStatus.toLowerCase()}`;
                  const payClass = order.paymentStatus === 'paid' ? 'badge-pay-paid' : 'badge-pay-pending';

                  return (
                    <tr key={order.id}>
                      <td className="font-bold">
                        <Link href={`/dashboard/orders/${order.id}`} className="order-link">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td>
                        <span className={`channel-badge ${order.marketplaceAccount?.marketplace}`}>
                          {order.marketplaceAccount?.marketplace.toUpperCase()}
                        </span>
                        <span className="channel-seller-name">
                          {order.marketplaceAccount?.sellerName}
                        </span>
                      </td>
                      <td>
                        <div className="cust-details">
                          <span className="cust-name">{order.customerName}</span>
                          <span className="cust-phone">{order.customerPhone}</span>
                        </div>
                      </td>
                      <td>
                        {new Date(order.marketplaceCreatedAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="price-value">
                        {formatIDR(Number(order.totalAmount))}
                      </td>
                      <td>
                        <span className={`badge ${payClass}`}>
                          {order.paymentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${statusClass}`}>
                          {order.orderStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <Link href={`/dashboard/orders/${order.id}`} className="btn-view-details">
                            Details
                          </Link>
                          <button
                            onClick={(e) => handleResyncSingle(e, order.id)}
                            className="btn-action-resync"
                            title="Resync this order"
                          >
                            🔄
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="responsive-table-wrapper">
            <table className="orders-table failed-orders-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Store Channel</th>
                  <th>Customer Info</th>
                  <th>Failed Date</th>
                  <th>Error Message</th>
                  <th className="text-center">Retries</th>
                  <th>Sync Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedOrders.map((fail) => {
                  return (
                    <tr key={fail.id} className="row-failed-sync">
                      <td className="font-bold text-red-glow">
                        {fail.orderNumber}
                      </td>
                      <td>
                        <span className={`channel-badge ${fail.marketplaceAccount?.marketplace}`}>
                          {fail.marketplaceAccount?.marketplace.toUpperCase()}
                        </span>
                        <span className="channel-seller-name">
                          {fail.marketplaceAccount?.sellerName}
                        </span>
                      </td>
                      <td>
                        <div className="cust-details">
                          <span className="cust-name">{fail.customerName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td>
                        {new Date(fail.createdAt).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="error-text-cell">
                        <div className="error-message-container">
                          <span className="warning-exclamation">⚠️</span>
                          <span className="error-message-text" title={fail.errorMessage}>
                            {fail.errorMessage}
                          </span>
                        </div>
                      </td>
                      <td className="font-bold text-center">
                        <span className={`retry-count-badge ${fail.retryCount >= 3 ? 'max-retries' : ''}`}>
                          {fail.retryCount} / 3
                        </span>
                      </td>
                      <td>
                        <span className={`badge-status ${fail.status === 'retrying' ? 'badge-status-pending glow-orange' : 'badge-status-failed glow-red'}`}>
                          {fail.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons-group">
                          <button
                            onClick={(e) => handleResyncFailed(e, fail.id, fail.orderNumber)}
                            disabled={retryingFailedId === fail.id}
                            className={`btn-action-resync-failed ${retryingFailedId === fail.id ? 'spinning' : ''}`}
                            title="Retry resync manually"
                          >
                            {retryingFailedId === fail.id ? '⏳' : '🔄'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="pagination-btn"
            >
              Previous
            </button>
            <span className="pagination-info">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="pagination-btn"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* Styled JSX */}
      <style jsx global>{`
        .orders-dashboard-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fade-in 0.4s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .metric-card {
          padding: 24px;
          border-radius: 16px;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease;
        }

        .metric-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.2);
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .metric-title {
          font-size: 0.9rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .metric-icon {
          font-size: 1.3rem;
          padding: 6px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
        }

        .metric-value {
          font-size: 2.2rem;
          font-weight: 700;
          color: #f8fafc;
          display: block;
          margin-bottom: 4px;
          letter-spacing: -0.02em;
        }

        .metric-hint {
          font-size: 0.75rem;
          color: #64748b;
        }

        .controls-section {
          padding: 24px;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .search-form .input-group {
          display: flex;
          position: relative;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 16px;
          width: 20px;
          height: 20px;
          color: #64748b;
        }

        .search-form input {
          width: 100%;
          padding: 14px 16px 14px 48px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          color: #f8fafc;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .search-form input:focus {
          border-color: rgba(99, 102, 241, 0.4);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
        }

        .btn-search {
          position: absolute;
          right: 8px;
          padding: 8px 18px;
          background: #6366f1;
          border: none;
          border-radius: 8px;
          color: #ffffff;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .btn-search:hover {
          opacity: 0.9;
        }

        .filter-groups {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          align-items: flex-end;
        }

        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
          min-width: 180px;
        }

        .filter-item label {
          font-size: 0.8rem;
          color: #94a3b8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .filter-item select {
          padding: 12px 14px;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          color: #e2e8f0;
          outline: none;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .btn-sync-all {
          padding: 12px 24px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 10px;
          color: #818cf8;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s ease;
          height: 48px;
        }

        .btn-sync-all:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.25);
          border-color: rgba(99, 102, 241, 0.5);
          color: #a5b4fc;
        }

        .btn-sync-all:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .table-section {
          padding: 24px;
          border-radius: 16px;
          min-height: 350px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .orders-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .orders-table th {
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .orders-table td {
          padding: 18px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: #e2e8f0;
          font-size: 0.95rem;
          vertical-align: middle;
        }

        .order-link {
          color: #6366f1;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .order-link:hover {
          color: #818cf8;
          text-decoration: underline;
        }

        .channel-badge {
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.7rem;
          margin-right: 8px;
        }

        .channel-badge.tiktok {
          background: #000000;
          color: #00f2fe;
          border: 1px solid #ff007f;
        }

        .channel-badge.shopee {
          background: rgba(234, 88, 12, 0.15);
          color: #f97316;
          border: 1px solid rgba(234, 88, 12, 0.3);
        }

        .channel-badge.lazada {
          background: rgba(14, 116, 144, 0.15);
          color: #06b6d4;
          border: 1px solid rgba(14, 116, 144, 0.3);
        }

        .channel-seller-name {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .cust-details {
          display: flex;
          flex-direction: column;
        }

        .cust-name {
          font-weight: 500;
          color: #f1f5f9;
        }

        .cust-phone {
          font-size: 0.8rem;
          color: #64748b;
        }

        .price-value {
          font-family: 'JetBrains Mono', monospace;
          color: #10b981;
          font-weight: 600;
        }

        .badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.75rem;
        }

        .badge-pay-paid {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .badge-pay-pending {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .badge-status {
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.75rem;
          display: inline-block;
        }

        .badge-status-pending {
          background: rgba(245, 158, 11, 0.12);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.25);
          box-shadow: 0 0 10px rgba(245, 158, 11, 0.05);
        }

        .badge-status-shipped {
          background: rgba(6, 182, 212, 0.12);
          color: #22d3ee;
          border: 1px solid rgba(6, 182, 212, 0.25);
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.05);
        }

        .badge-status-delivered {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.05);
        }

        .badge-status-cancelled {
          background: rgba(244, 63, 94, 0.12);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.25);
        }

        .action-buttons-group {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          align-items: center;
        }

        .btn-view-details {
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #cbd5e1;
          font-size: 0.85rem;
          font-weight: 500;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .btn-view-details:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          color: #f1f5f9;
        }

        .btn-action-resync {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px;
          border-radius: 6px;
          transition: background-color 0.2s ease, transform 0.2s ease;
        }

        .btn-action-resync:hover {
          background-color: rgba(255, 255, 255, 0.05);
          transform: rotate(45deg);
        }

        .pagination-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
        }

        .pagination-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          color: #94a3b8;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .pagination-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          color: #e2e8f0;
        }

        .pagination-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 0.85rem;
          color: #64748b;
        }

        .table-loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          gap: 16px;
          color: #94a3b8;
        }

        .spinner-glow {
          width: 36px;
          height: 36px;
          border: 3px solid rgba(99, 102, 241, 0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 24px;
          text-align: center;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        .empty-state h3 {
          font-size: 1.2rem;
          color: #f1f5f9;
          margin-bottom: 8px;
        }

        .empty-state p {
          color: #64748b;
          font-size: 0.9rem;
          max-width: 320px;
        }

        .toast-alert {
          position: fixed;
          top: 30px;
          right: 30px;
          padding: 16px 24px;
          border-radius: 12px;
          z-index: 100;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
          animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes slide-in {
          from { transform: translateX(100%) opacity: 0; }
          to { transform: translateX(0) opacity: 1; }
        }

        .toast-alert.success {
          background: rgba(16, 185, 129, 0.95);
          border: 1px solid rgba(16, 185, 129, 0.2);
          color: #ffffff;
        }

        .toast-alert.error {
          background: rgba(244, 63, 94, 0.95);
          border: 1px solid rgba(244, 63, 94, 0.2);
          color: #ffffff;
        }

        .toast-content {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 550;
        }

        .toast-icon {
          font-size: 1.1rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Dynamic and failed tab systems styling */
        .orders-tab-container {
          display: flex;
          gap: 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 8px;
          margin-top: 10px;
        }

        .tab-btn {
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 10px 20px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          transition: color 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn:hover {
          color: #f8fafc;
        }

        .tab-btn.active {
          color: #6366f1;
        }

        .tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: -9px;
          left: 0;
          right: 0;
          height: 2px;
          background: #6366f1;
          border-radius: 2px;
          box-shadow: 0 0 8px #6366f1;
        }

        .failed-tab-btn.active {
          color: #ef4444 !important;
        }

        .failed-tab-btn.active::after {
          background: #ef4444 !important;
          box-shadow: 0 0 8px #ef4444 !important;
        }

        .badge-count-glow {
          background: #ef4444;
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 20px;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
          animation: pulse-glow 2s infinite ease-in-out;
        }

        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.05); opacity: 1; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8); }
        }

        .metric-card.glowing-red {
          border-color: rgba(239, 68, 68, 0.15);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.05);
        }

        .metric-card.glowing-red:hover {
          border-color: rgba(239, 68, 68, 0.35);
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
        }

        .text-red {
          color: #ef4444 !important;
        }

        .text-red-glow {
          color: #f87171 !important;
          text-shadow: 0 0 4px rgba(239, 68, 68, 0.2);
        }

        .badge-status-failed {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
          border: 1px solid rgba(239, 68, 68, 0.2) !important;
        }

        .glow-red {
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.3);
        }

        .glow-orange {
          box-shadow: 0 0 8px rgba(249, 115, 22, 0.3);
        }

        /* Error cells */
        .error-text-cell {
          max-width: 300px;
        }

        .error-message-container {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.04);
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(239, 68, 68, 0.08);
        }

        .warning-exclamation {
          font-size: 0.95rem;
        }

        .error-message-text {
          font-size: 0.85rem;
          color: #fca5a5;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .retry-count-badge {
          background: rgba(255, 255, 255, 0.05);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .retry-count-badge.max-retries {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.2);
        }

        /* Sync Actions for failed order rows */
        .btn-action-resync-failed {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-action-resync-failed:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.18);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ffffff;
          transform: scale(1.05);
        }

        .btn-action-resync-failed.spinning {
          animation: spin-failed 1.2s linear infinite;
          opacity: 0.6;
          cursor: not-allowed;
        }

        @keyframes spin-failed {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .btn-retry-all-failed {
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #ffffff;
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
        }

        .btn-retry-all-failed:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.25);
          border-color: #ef4444;
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.25);
        }

        .btn-retry-all-failed:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

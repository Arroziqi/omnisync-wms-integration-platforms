"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  productVariantId: string | null;
  variant?: {
    variantSku: string;
    variantName: string;
    product?: {
      brand: string;
      category: string;
    };
  };
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
  createdAt: string;
  updatedAt: string;
  marketplaceAccount: {
    marketplace: string;
    sellerName: string;
  };
  items: OrderItem[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/orders/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        showToast('Failed to retrieve order detailed metrics.', 'error');
      }
    } catch (err) {
      console.error('Error fetching order detail:', err);
      showToast('A network error occurred while loading this order.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const handleResyncSingle = async () => {
    try {
      setSyncing(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/orders/${id}/resync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Single order sync enqueued successfully.', 'success');
        // Refresh details after queue processes
        setTimeout(() => {
          fetchOrderDetail();
        }, 1200);
      } else {
        showToast(data.message || 'Failed to sync specific order.', 'error');
      }
    } catch (err) {
      showToast('Network error syncing order.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="detail-loading-wrapper">
        <div className="spinner-glow"></div>
        <span>Retrieving order specification details...</span>
        <style jsx>{`
          .detail-loading-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 16px;
            color: #94a3b8;
          }
          .spinner-glow {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(99, 102, 241, 0.1);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="error-state">
        <h2>Order Not Found</h2>
        <p>The requested order does not exist or has been removed.</p>
        <Link href="/dashboard/orders" className="btn-back">
          Return to Orders
        </Link>
        <style jsx>{`
          .error-state {
            text-align: center;
            padding: 80px 24px;
          }
          h2 { color: #f1f5f9; margin-bottom: 8px; }
          p { color: #64748b; margin-bottom: 24px; }
          .btn-back {
            padding: 10px 20px;
            background: #6366f1;
            border-radius: 8px;
            color: #fff;
            text-decoration: none;
          }
        `}</style>
      </div>
    );
  }

  // Calculate Subtotals
  const orderSubtotal = order.items.reduce((sum, item) => sum + Number(item.subtotal), 0);
  const orderShipping = Number(order.totalAmount) - orderSubtotal;

  // Determine timeline steps active state
  const statusLower = order.orderStatus.toLowerCase();
  const stepCreated = true;
  const stepSynced = true;
  const stepReserved = statusLower === 'pending' || statusLower === 'shipped' || statusLower === 'delivered';
  const stepShipped = statusLower === 'shipped' || statusLower === 'delivered';
  const stepDelivered = statusLower === 'delivered';
  const stepCancelled = statusLower === 'cancelled';

  return (
    <div className="order-detail-layout">
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

      {/* Back Header navigation */}
      <div className="back-bar">
        <Link href="/dashboard/orders" className="btn-back-link">
          ← Back to Orders List
        </Link>
        <button
          onClick={handleResyncSingle}
          disabled={syncing}
          className={`btn-sync-detail ${syncing ? 'loading' : ''}`}
        >
          {syncing ? (
            <>
              <span className="spinner"></span>
              <span>Resyncing...</span>
            </>
          ) : (
            <>
              <span>🔄 Trigger Manual Resync</span>
            </>
          )}
        </button>
      </div>

      <div className="detail-grid">
        {/* Left column: Info Cards */}
        <div className="detail-main">
          {/* Timeline Tracker */}
          <div className="glass-card detail-card timeline-card">
            <h3>Order Status Lifecycle</h3>
            
            {stepCancelled ? (
              <div className="cancelled-timeline-state">
                <span className="state-icon">🚫</span>
                <div>
                  <h4>Order Synchronization Cancelled</h4>
                  <p>This order has been cancelled on the marketplace. Inventory reservation was automatically released.</p>
                </div>
              </div>
            ) : (
              <div className="timeline-flow">
                <div className={`timeline-step ${stepCreated ? 'completed' : ''}`}>
                  <div className="step-number">1</div>
                  <span className="step-label">Created on Channel</span>
                </div>
                <div className="timeline-connector"></div>
                <div className={`timeline-step ${stepSynced ? 'completed' : ''}`}>
                  <div className="step-number">2</div>
                  <span className="step-label">Synced to OmniSync</span>
                </div>
                <div className="timeline-connector"></div>
                <div className={`timeline-step ${stepReserved ? 'completed' : ''}`}>
                  <div className="step-number">3</div>
                  <span className="step-label">Stock Reserved</span>
                </div>
                <div className="timeline-connector"></div>
                <div className={`timeline-step ${stepShipped ? 'completed' : ''}`}>
                  <div className="step-number">4</div>
                  <span className="step-label">Shipped</span>
                </div>
                <div className="timeline-connector"></div>
                <div className={`timeline-step ${stepDelivered ? 'completed' : ''}`}>
                  <div className="step-number">5</div>
                  <span className="step-label">Completed</span>
                </div>
              </div>
            )}
          </div>

          {/* Line Items Card */}
          <div className="glass-card detail-card line-items-card">
            <h3>Ordered Products Line Items</h3>
            <div className="items-table-wrapper">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Product & Variant Description</th>
                    <th>WMS SKU Mapping</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="item-prod-info">
                          <span className="item-prod-name">{item.productName}</span>
                          {item.variant && (
                            <span className="item-prod-meta">
                              {item.variant.variantName} • {item.variant.product?.brand || 'Generic'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {item.variant ? (
                          <span className="sku-mapped-badge">
                            {item.variant.variantSku}
                          </span>
                        ) : (
                          <span className="sku-unmapped-badge">
                            ⚠️ UNMAPPED SKU
                          </span>
                        )}
                      </td>
                      <td className="text-right monospace">{formatIDR(Number(item.price))}</td>
                      <td className="text-center font-bold">{item.quantity}</td>
                      <td className="text-right monospace font-bold color-green">
                        {formatIDR(Number(item.subtotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="calculation-breakdown-section">
              <div className="calc-row">
                <span>Items Subtotal</span>
                <span className="monospace">{formatIDR(orderSubtotal)}</span>
              </div>
              <div className="calc-row">
                <span>Marketplace Shipping Fee</span>
                <span className="monospace">{formatIDR(orderShipping)}</span>
              </div>
              <div className="calc-row total">
                <span>Total Amount Charged</span>
                <span className="monospace color-green">{formatIDR(Number(order.totalAmount))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Sidebars Info */}
        <div className="detail-sidebar">
          {/* Metadata Card */}
          <div className="glass-card sidebar-info-card">
            <h3>Integration Metadata</h3>
            <div className="info-item">
              <span className="info-label">Order Number</span>
              <span className="info-value font-bold">{order.orderNumber}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Marketplace Channel</span>
              <span className={`channel-badge ${order.marketplaceAccount?.marketplace}`}>
                {order.marketplaceAccount?.marketplace.toUpperCase()}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Seller Account</span>
              <span className="info-value">{order.marketplaceAccount?.sellerName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Payment Status</span>
              <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-pay-paid' : 'badge-pay-pending'}`}>
                {order.paymentStatus.toUpperCase()}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">OmniSync Sync Date</span>
              <span className="info-value">
                {new Date(order.createdAt).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Customer & Address Card */}
          <div className="glass-card sidebar-info-card">
            <h3>Recipient Specifications</h3>
            <div className="info-item">
              <span className="info-label">Customer Name</span>
              <span className="info-value font-bold">{order.customerName}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Contact Phone</span>
              <span className="info-value">{order.customerPhone}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Shipping Destination</span>
              <p className="destination-text">{order.customerAddress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Styled JSX */}
      <style jsx global>{`
        .order-detail-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
          animation: fade-in 0.4s ease;
        }

        .back-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-back-link {
          color: #cbd5e1;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.95rem;
          transition: color 0.2s ease;
        }

        .btn-back-link:hover {
          color: #6366f1;
        }

        .btn-sync-detail {
          padding: 10px 20px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 8px;
          color: #818cf8;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }

        .btn-sync-detail:hover:not(:disabled) {
          background: rgba(99, 102, 241, 0.25);
          border-color: rgba(99, 102, 241, 0.5);
          color: #a5b4fc;
        }

        .btn-sync-detail:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }

        @media (max-width: 1024px) {
          .detail-grid {
            grid-template-columns: 1fr;
          }
        }

        .detail-main, .detail-sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .detail-card, .sidebar-info-card {
          padding: 28px;
          border-radius: 16px;
        }

        .detail-card h3, .sidebar-info-card h3 {
          font-size: 1.1rem;
          color: #f8fafc;
          margin-bottom: 20px;
          font-weight: 600;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 12px;
        }

        /* Timeline Flow styling */
        .timeline-flow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 0;
        }

        .timeline-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex-basis: 0;
          flex-grow: 1;
          position: relative;
        }

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }

        .step-label {
          font-size: 0.75rem;
          color: #64748b;
          text-align: center;
          font-weight: 600;
          max-width: 90px;
        }

        .timeline-connector {
          height: 2px;
          background: rgba(255, 255, 255, 0.05);
          flex-grow: 2;
          margin-bottom: 24px;
          transition: all 0.3s ease;
        }

        .timeline-step.completed .step-number {
          background: rgba(99, 102, 241, 0.15);
          border-color: #6366f1;
          color: #a5b4fc;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
        }

        .timeline-step.completed .step-label {
          color: #cbd5e1;
        }

        .cancelled-timeline-state {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: rgba(244, 63, 94, 0.08);
          border: 1px solid rgba(244, 63, 94, 0.2);
          border-radius: 10px;
          color: #fda4af;
        }

        .cancelled-timeline-state h4 {
          margin: 0 0 4px 0;
          font-weight: 600;
        }

        .cancelled-timeline-state p {
          margin: 0;
          font-size: 0.85rem;
          color: #fda4af;
        }

        .state-icon {
          font-size: 2rem;
        }

        /* Items Table */
        .items-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .items-table th {
          padding: 12px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .items-table td {
          padding: 16px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: #cbd5e1;
          font-size: 0.95rem;
        }

        .item-prod-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .item-prod-name {
          font-weight: 550;
          color: #f1f5f9;
        }

        .item-prod-meta {
          font-size: 0.8rem;
          color: #64748b;
        }

        .sku-mapped-badge {
          padding: 4px 8px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 6px;
          color: #818cf8;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .sku-unmapped-badge {
          padding: 4px 8px;
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.2);
          border-radius: 6px;
          color: #fbbf24;
          font-size: 0.78rem;
          font-weight: 600;
        }

        /* Calculations */
        .calculation-breakdown-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          width: 50%;
          margin-left: auto;
        }

        @media (max-width: 768px) {
          .calculation-breakdown-section {
            width: 100%;
          }
        }

        .calc-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .calc-row.total {
          border-top: 1px dashed rgba(255, 255, 255, 0.1);
          padding-top: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          color: #f8fafc;
        }

        /* Sidebar info cards */
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 18px;
        }

        .info-item:last-child {
          margin-bottom: 0;
        }

        .info-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.03em;
        }

        .info-value {
          font-size: 0.95rem;
          color: #cbd5e1;
        }

        .destination-text {
          font-size: 0.9rem;
          color: #cbd5e1;
          line-height: 1.5;
          margin: 0;
        }

        .monospace {
          font-family: 'JetBrains Mono', monospace;
        }

        .color-green {
          color: #10b981 !important;
        }

        .channel-badge {
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.75rem;
          display: inline-block;
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

        .badge {
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.75rem;
          display: inline-block;
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
      `}</style>
    </div>
  );
}

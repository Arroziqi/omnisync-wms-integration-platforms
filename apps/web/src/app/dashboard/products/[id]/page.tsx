"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Variant {
  id: string;
  variantName: string;
  variantSku: string;
  price: number;
  currency: string;
  weight: number;
}

interface Mapping {
  id: string;
  marketplaceAccountId: string;
  marketplaceProductId: string;
  marketplaceVariantId: string | null;
  syncStatus: string;
  lastSyncedAt: string | null;
  marketplaceAccount?: {
    sellerName: string;
    marketplace: string;
  };
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  brand: string | null;
  status: string;
  variants: Variant[];
  mappings: Mapping[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // New variant inline form
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [newVariant, setNewVariant] = useState({
    variantName: '',
    variantSku: '',
    price: 0,
    currency: 'USD',
    weight: 0,
  });

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProductDetails = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/products/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      } else {
        showToast('Error retrieving product details', 'error');
        router.push('/dashboard/products');
      }
    } catch (err) {
      showToast('Network error loading product details', 'error');
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchProductDetails().finally(() => setLoading(false));
    }
  }, [id]);

  const handleSyncNow = async () => {
    if (!product || product.mappings?.length === 0) {
      showToast('Cannot sync a product with no marketplace mappings', 'error');
      return;
    }

    setSyncing(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/products/${product.id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        showToast('Manual catalog sync dispatched successfully!');
        // Small delay to let simulation complete in background
        setTimeout(async () => {
          await fetchProductDetails();
          setSyncing(false);
        }, 1200);
      } else {
        showToast('Failed to trigger manual sync', 'error');
        setSyncing(false);
      }
    } catch (err) {
      showToast('Network error during sync execution', 'error');
      setSyncing(false);
    }
  };

  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVariant.variantName || !newVariant.variantSku) {
      showToast('Variant Option Name and SKU are required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/products/${id}/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newVariant),
      });

      if (res.ok) {
        showToast('WMS variant added successfully!');
        setIsAddVariantOpen(false);
        setNewVariant({ variantName: '', variantSku: '', price: 0, currency: 'USD', weight: 0 });
        fetchProductDetails();
      } else {
        const err = await res.json();
        showToast(err.message || 'Error creating variant', 'error');
      }
    } catch (err) {
      showToast('Network error creating variant', 'error');
    }
  };

  if (loading) {
    return (
      <div className="loader-box glass-card">
        <div className="spinner"></div>
        <p>Retrieving Product Spec & Catalog mappings...</p>
        <style jsx>{`
          .loader-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            color: #94a3b8;
            gap: 16px;
            background: rgba(15, 23, 42, 0.4);
            border-radius: 16px;
          }
          .spinner {
            width: 36px;
            height: 36px;
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

  if (!product) {
    return (
      <div className="error-box glass-card">
        <p>Master product record not found.</p>
        <Link href="/dashboard/products" className="btn-primary">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header breadcrumbs */}
      <div className="breadcrumb-nav">
        <Link href="/dashboard/products" className="btn-back">
          ← Back to Master Products
        </Link>
      </div>

      {/* Master Card Details */}
      <section className="product-overview glass-card">
        <div className="overview-header">
          <div className="title-area">
            <span className="badge-status status-active">WMS MASTER</span>
            <h2>{product.name}</h2>
            <code className="master-sku">SKU: {product.sku}</code>
          </div>

          <div className="actions-area">
            {product.mappings?.length > 0 && (
              <button
                onClick={handleSyncNow}
                disabled={syncing}
                className={`btn-sync-action ${syncing ? 'loading-shimmer' : ''}`}
              >
                {syncing ? '🔄 Syncing Catalog...' : '⚡ Sync Catalog Now'}
              </button>
            )}
          </div>
        </div>

        <hr className="divider" />

        <div className="overview-meta">
          <div className="meta-item">
            <span className="meta-label">Category</span>
            <span className="meta-value">{product.category || 'Not categorized'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Brand</span>
            <span className="meta-value">{product.brand || 'No Brand assigned'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Total Sync Channels</span>
            <span className="meta-value">{product.mappings?.length || 0} Connected</span>
          </div>
        </div>

        <div className="overview-desc">
          <span className="meta-label">Description</span>
          <p>{product.description || 'No description provided.'}</p>
        </div>
      </section>

      {/* Grid of Variants & Mapping */}
      <div className="detail-split-grid">
        {/* WMS Product Variants Table */}
        <section className="variants-section glass-card">
          <div className="section-header">
            <h3>WMS Product Variations</h3>
            <button className="btn-secondary btn-sm" onClick={() => setIsAddVariantOpen(true)}>
              ➕ Add Variant
            </button>
          </div>

          <table className="details-table">
            <thead>
              <tr>
                <th>Option Name</th>
                <th>Variation SKU</th>
                <th>Price</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              {product.variants?.map((v) => (
                <tr key={v.id}>
                  <td className="font-semibold">{v.variantName}</td>
                  <td><code>{v.variantSku}</code></td>
                  <td>${v.price} {v.currency}</td>
                  <td>{v.weight} KG</td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={4} className="text-center text-secondary">
                    No variations defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Integration Mapping Cards */}
        <section className="mappings-section glass-card">
          <div className="section-header">
            <h3>Active Channel Connections</h3>
          </div>

          {product.mappings?.length === 0 ? (
            <div className="empty-mapping-state">
              <span className="empty-mapping-icon">🔗</span>
              <p>This master WMS product is not mapped to any active marketplace listings yet.</p>
              <Link href="/dashboard/products" className="btn-secondary btn-sm">
                Open SKU Linker Tool
              </Link>
            </div>
          ) : (
            <div className="mapping-cards-stack">
              {product.mappings?.map((m) => {
                const market = m.marketplaceAccount?.marketplace || 'store';
                return (
                  <div key={m.id} className="mapping-item-card">
                    <div className="mapping-card-header">
                      <span className={`channel-badge badge-mapping market-${market}`}>
                        {market.toUpperCase()}
                      </span>
                      <span className={`sync-status-badge status-${m.syncStatus}`}>
                        {m.syncStatus.toUpperCase()}
                      </span>
                    </div>

                    <div className="mapping-card-body">
                      <div className="mapping-field">
                        <span className="mapping-label">Seller Account</span>
                        <span className="mapping-val">{m.marketplaceAccount?.sellerName || 'Connected Store'}</span>
                      </div>
                      <div className="mapping-field">
                        <span className="mapping-label">Remote Product ID</span>
                        <span className="mapping-val code">{m.marketplaceProductId}</span>
                      </div>
                      {m.marketplaceVariantId && (
                        <div className="mapping-field">
                          <span className="mapping-label">Remote Variant ID</span>
                          <span className="mapping-val code">{m.marketplaceVariantId}</span>
                        </div>
                      )}
                      <div className="mapping-field">
                        <span className="mapping-label">Last Successful Sync</span>
                        <span className="mapping-val">
                          {m.lastSyncedAt ? new Date(m.lastSyncedAt).toLocaleString() : 'Never synced'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal Add Variant */}
      {isAddVariantOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-down">
            <div className="modal-header">
              <h2>Add Product Variant</h2>
              <button className="btn-close" onClick={() => setIsAddVariantOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateVariant} className="modal-form">
              <div className="form-group">
                <label>Variant Option Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Purple / 512GB"
                  value={newVariant.variantName}
                  onChange={(e) => setNewVariant({ ...newVariant, variantName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Variant SKU *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IP15-PURP-512"
                  value={newVariant.variantSku}
                  onChange={(e) => setNewVariant({ ...newVariant, variantSku: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newVariant.price || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, price: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Weight (KG)</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={newVariant.weight || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, weight: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddVariantOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Variation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded style jsx sheets */}
      <style jsx global>{`
        .product-detail-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #f8fafc;
          font-family: system-ui, sans-serif;
        }

        .breadcrumb-nav {
          display: flex;
        }

        .btn-back {
          color: #94a3b8;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.9rem;
          transition: color 0.2s ease;
        }

        .btn-back:hover {
          color: #fff;
        }

        /* Product Overview Card */
        .product-overview {
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 30px;
          border-radius: 16px;
        }

        .overview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .title-area {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .title-area h2 {
          font-size: 1.7rem;
          font-weight: 700;
          color: #fff;
          margin-top: 4px;
        }

        .master-sku {
          font-family: monospace;
          color: #64748b;
          font-size: 0.9rem;
        }

        .btn-sync-action {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
          transition: all 0.25s ease;
        }

        .btn-sync-action:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
        }

        .btn-sync-action:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .divider {
          border: 0;
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
          margin: 24px 0;
        }

        .overview-meta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 24px;
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-label {
          font-size: 0.82rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .meta-value {
          font-size: 1rem;
          color: #cbd5e1;
          font-weight: 500;
        }

        .overview-desc p {
          color: #cbd5e1;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-top: 6px;
        }

        /* Detail split grid */
        .detail-split-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 20px;
        }

        @media (max-width: 992px) {
          .detail-split-grid {
            grid-template-columns: 1fr;
          }
        }

        .variants-section, .mappings-section {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          padding: 24px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h3 {
          font-size: 1.15rem;
          font-weight: 600;
          color: #fff;
        }

        .btn-sm {
          font-size: 0.8rem;
          padding: 6px 12px;
          border-radius: 8px;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
        }

        .details-table th {
          padding: 12px 16px;
          color: #64748b;
          font-size: 0.8rem;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          text-align: left;
        }

        .details-table td {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          font-size: 0.9rem;
        }

        .font-semibold { font-weight: 600; color: #fff; }

        /* Mappings items stack */
        .empty-mapping-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          gap: 12px;
          color: #64748b;
        }

        .empty-mapping-icon {
          font-size: 2.5rem;
        }

        .mapping-cards-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .mapping-item-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 16px;
        }

        .mapping-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .channel-badge {
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 600;
        }

        .sync-status-badge {
          font-size: 0.72rem;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 700;
        }

        .mapping-card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mapping-field {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.02);
          padding-bottom: 4px;
        }

        .mapping-label {
          color: #64748b;
        }

        .mapping-val {
          color: #cbd5e1;
        }

        .mapping-val.code {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 6px;
          border-radius: 4px;
          font-size: 0.8rem;
        }

        /* Modal additions */
        .form-row { display: flex; gap: 16px; }

        /* Sync shimmer loader animation */
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: 200px 0; }
        }
        .loading-shimmer {
          background: linear-gradient(90deg, #10b981 25%, #34d399 50%, #10b981 75%);
          background-size: 200px 100%;
          animation: shimmer 1.5s infinite;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

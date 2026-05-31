"use client";

import { useState, useEffect } from 'react';
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

interface MarketplaceAccount {
  id: string;
  marketplace: string;
  sellerName: string;
  status: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<MarketplaceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals & Drawers States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isMappingDrawerOpen, setIsMappingDrawerOpen] = useState(false);

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    brand: '',
    status: 'draft',
    variants: [] as { variantName: string; variantSku: string; price: number; weight: number }[],
  });
  const [newVariant, setNewVariant] = useState({ variantName: '', variantSku: '', price: 0, weight: 0 });

  // Mapping Form State
  const [mappingForm, setMappingForm] = useState({
    productId: '',
    marketplaceAccountId: '',
    marketplaceProductId: '',
    marketplaceVariantId: '',
  });

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (categoryFilter) query.append('category', categoryFilter);
      if (brandFilter) query.append('brand', brandFilter);

      const res = await fetch(`${apiBase}/api/v1/products?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load products list', 'error');
    }
  };

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/marketplace-accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.filter((a: any) => a.status === 'active'));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchProducts(), fetchAccounts()]).finally(() => setLoading(false));
  }, [search, categoryFilter, brandFilter]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.sku || !newProduct.name) {
      showToast('Product SKU and Name are required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newProduct),
      });

      if (res.ok) {
        showToast('Master product created successfully!');
        setIsAddModalOpen(false);
        setNewProduct({
          sku: '',
          name: '',
          description: '',
          category: '',
          brand: '',
          status: 'draft',
          variants: [],
        });
        fetchProducts();
      } else {
        const err = await res.json();
        showToast(err.message || 'Error creating master product', 'error');
      }
    } catch (err) {
      showToast('Network error while creating product', 'error');
    }
  };

  const handleAddVariantToForm = () => {
    if (!newVariant.variantName || !newVariant.variantSku) {
      showToast('Variant Name and SKU are required', 'error');
      return;
    }
    setNewProduct({
      ...newProduct,
      variants: [...newProduct.variants, newVariant],
    });
    setNewVariant({ variantName: '', variantSku: '', price: 0, weight: 0 });
  };

  const handleRemoveVariantFromForm = (index: number) => {
    setNewProduct({
      ...newProduct,
      variants: newProduct.variants.filter((_, i) => i !== index),
    });
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    const { productId, marketplaceAccountId, marketplaceProductId } = mappingForm;
    if (!productId || !marketplaceAccountId || !marketplaceProductId) {
      showToast('Product, Connection, and Remote Listing ID are required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/products/mapping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(mappingForm),
      });

      if (res.ok) {
        showToast('SKU mapping linked and sync triggered!');
        setIsMappingDrawerOpen(false);
        setMappingForm({
          productId: '',
          marketplaceAccountId: '',
          marketplaceProductId: '',
          marketplaceVariantId: '',
        });
        fetchProducts();
      } else {
        const err = await res.json();
        showToast(err.message || 'Error linking mapping', 'error');
      }
    } catch (err) {
      showToast('Network error while linking mapping', 'error');
    }
  };

  const handleSyncProduct = async (id: string) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/products/${id}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Sync pipeline dispatched successfully!');
        fetchProducts();
      } else {
        showToast('Failed to trigger sync', 'error');
      }
    } catch (err) {
      showToast('Sync request network error', 'error');
    }
  };

  // Metrics counts
  const totalProducts = products.length;
  const totalVariants = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);
  const totalMappings = products.reduce((acc, p) => acc + (p.mappings?.length || 0), 0);
  const totalSynced = products.reduce(
    (acc, p) => acc + p.mappings.filter((m) => m.syncStatus === 'synced').length,
    0
  );

  return (
    <div className="products-container">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Metrics Row */}
      <section className="metrics-grid">
        <div className="metric-card glass-card">
          <div className="metric-icon blue-glow">📦</div>
          <div className="metric-info">
            <span className="metric-value">{totalProducts}</span>
            <span className="metric-label">Master Products</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon purple-glow">🧬</div>
          <div className="metric-info">
            <span className="metric-value">{totalVariants}</span>
            <span className="metric-label">Active Variants</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon cyan-glow">🔗</div>
          <div className="metric-info">
            <span className="metric-value">{totalMappings}</span>
            <span className="metric-label">Mapped SKUs</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon green-glow">⚡</div>
          <div className="metric-info">
            <span className="metric-value">
              {totalMappings > 0 ? Math.round((totalSynced / totalMappings) * 100) : 100}%
            </span>
            <span className="metric-label">Sync Health Rate</span>
          </div>
        </div>
      </section>

      {/* Action Control Panel */}
      <section className="controls-panel glass-card">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by SKU, Product Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filters-group">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="Electronics">Electronics</option>
            <option value="Apparel">Apparel</option>
            <option value="Home">Home & Living</option>
            <option value="Health">Health & Beauty</option>
          </select>

          <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="">All Brands</option>
            <option value="OmniSync">OmniSync</option>
            <option value="Logitech">Logitech</option>
            <option value="Samsung">Samsung</option>
            <option value="Nike">Nike</option>
          </select>
        </div>

        <div className="action-buttons">
          <button className="btn-secondary" onClick={() => setIsMappingDrawerOpen(true)}>
            🔗 SKU Linker
          </button>
          <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
            ➕ Add Product
          </button>
        </div>
      </section>

      {/* Main Grid View */}
      <section className="table-wrapper glass-card">
        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Scanning Master Inventory...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <h3>No Master Products Found</h3>
            <p>Create a product or clear filters to start SKU mapping.</p>
          </div>
        ) : (
          <table className="products-table">
            <thead>
              <tr>
                <th>Master Product</th>
                <th>Category / Brand</th>
                <th>Variants</th>
                <th>Channel Linkings</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="product-identity">
                      <span className="product-name">{product.name}</span>
                      <span className="product-sku">SKU: {product.sku}</span>
                    </div>
                  </td>
                  <td>
                    <div className="meta-info">
                      <span className="badge-meta">{product.category || 'Uncategorized'}</span>
                      <span className="text-secondary">{product.brand || 'No Brand'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="variants-pills">
                      {product.variants?.map((v) => (
                        <span key={v.id} className="pill-variant">
                          {v.variantName} ({v.price} {v.currency})
                        </span>
                      )) || <span className="text-secondary">-</span>}
                    </div>
                  </td>
                  <td>
                    <div className="mappings-stack">
                      {product.mappings?.map((m) => {
                        const market = m.marketplaceAccount?.marketplace || 'store';
                        const status = m.syncStatus;
                        return (
                          <span key={m.id} className={`badge-mapping market-${market} status-${status}`}>
                            {market.toUpperCase()}: {status}
                          </span>
                        );
                      }) || <span className="text-secondary">Unmapped</span>}
                      {product.mappings?.length === 0 && (
                        <span className="badge-mapping status-pending">Unmapped</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`badge-status status-${product.status}`}>
                      {product.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <Link href={`/dashboard/products/${product.id}`} className="btn-action-icon" title="View details & mapping">
                        👁️
                      </Link>
                      {product.mappings?.length > 0 && (
                        <button
                          onClick={() => handleSyncProduct(product.id)}
                          className="btn-action-icon btn-sync-trigger"
                          title="Sync Product"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Slide-Down Creation Wizard Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-down">
            <div className="modal-header">
              <h2>Add Master WMS Product</h2>
              <button className="btn-close" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddProduct} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Master SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MASTER-IPHONE15"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. iPhone 15 Pro Max"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Enter details..."
                  rows={2}
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Electronics"
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple"
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Publish Status</label>
                  <select
                    value={newProduct.status}
                    onChange={(e) => setNewProduct({ ...newProduct, status: e.target.value })}
                  >
                    <option value="draft">DRAFT</option>
                    <option value="active">ACTIVE</option>
                    <option value="archived">ARCHIVED</option>
                  </select>
                </div>
              </div>

              {/* Variant Inline Creator */}
              <div className="variant-creator-box">
                <h3>Product Variations (Colors, Sizes, etc.)</h3>
                <div className="variant-inline-form">
                  <input
                    type="text"
                    placeholder="Name: e.g. Black / 256GB"
                    value={newVariant.variantName}
                    onChange={(e) => setNewVariant({ ...newVariant, variantName: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Variant SKU: e.g. IP15-BLK-256"
                    value={newVariant.variantSku}
                    onChange={(e) => setNewVariant({ ...newVariant, variantSku: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Price ($)"
                    value={newVariant.price || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, price: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder="Weight (KG)"
                    value={newVariant.weight || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, weight: Number(e.target.value) })}
                  />
                  <button type="button" className="btn-add-variant" onClick={handleAddVariantToForm}>
                    Add
                  </button>
                </div>

                {/* Inline Variants List */}
                {newProduct.variants.length > 0 && (
                  <table className="form-variants-table">
                    <thead>
                      <tr>
                        <th>Variant Option</th>
                        <th>Variant SKU</th>
                        <th>Price</th>
                        <th>Weight</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {newProduct.variants.map((v, idx) => (
                        <tr key={idx}>
                          <td>{v.variantName}</td>
                          <td><code>{v.variantSku}</code></td>
                          <td>${v.price}</td>
                          <td>{v.weight} KG</td>
                          <td>
                            <button
                              type="button"
                              className="btn-remove-variant"
                              onClick={() => handleRemoveVariantFromForm(idx)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Master Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Right Slide-Out SKU Mapping Drawer */}
      {isMappingDrawerOpen && (
        <div className="drawer-backdrop" onClick={() => setIsMappingDrawerOpen(false)}>
          <div className="drawer-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2>SKU Connector Linker</h2>
              <button className="btn-close" onClick={() => setIsMappingDrawerOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateMapping} className="drawer-form">
              <p className="drawer-subtitle">
                Link a physical WMS product variant to an external marketplace listing item ID to trigger automatic background catalog updates.
              </p>

              <div className="form-group">
                <label>Select Master WMS Product</label>
                <select
                  required
                  value={mappingForm.productId}
                  onChange={(e) => setMappingForm({ ...mappingForm, productId: e.target.value })}
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Connected Channel Account</label>
                <select
                  required
                  value={mappingForm.marketplaceAccountId}
                  onChange={(e) => setMappingForm({ ...mappingForm, marketplaceAccountId: e.target.value })}
                >
                  <option value="">-- Choose Integration --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.marketplace.toUpperCase()} - {a.sellerName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Marketplace Item ID (Remote Listing ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sh-product-1004"
                  value={mappingForm.marketplaceProductId}
                  onChange={(e) => setMappingForm({ ...mappingForm, marketplaceProductId: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Marketplace Variant ID (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. sh-var-color-black"
                  value={mappingForm.marketplaceVariantId}
                  onChange={(e) => setMappingForm({ ...mappingForm, marketplaceVariantId: e.target.value })}
                />
              </div>

              <button type="submit" className="btn-primary btn-block">
                Establish SKU Mapping & Sync
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Styled Sheets */}
      <style jsx global>{`
        .products-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #f8fafc;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }

        .metric-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px 24px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .metric-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .blue-glow { background: rgba(59, 130, 246, 0.15); box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
        .purple-glow { background: rgba(147, 51, 234, 0.15); box-shadow: 0 0 15px rgba(147, 51, 234, 0.2); }
        .cyan-glow { background: rgba(6, 182, 212, 0.15); box-shadow: 0 0 15px rgba(6, 182, 212, 0.2); }
        .green-glow { background: rgba(16, 185, 129, 0.15); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }

        .metric-info {
          display: flex;
          flex-direction: column;
        }

        .metric-value {
          font-size: 1.7rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.1;
        }

        .metric-label {
          font-size: 0.85rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* Controls Panel */
        .controls-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.4);
          gap: 16px;
          flex-wrap: wrap;
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 8px 16px;
          border-radius: 10px;
          flex-grow: 1;
          max-width: 400px;
        }

        .search-box svg { width: 18px; height: 18px; color: #64748b; }
        .search-box input {
          background: transparent;
          border: none;
          color: #fff;
          outline: none;
          width: 100%;
          font-size: 0.92rem;
        }

        .filters-group {
          display: flex;
          gap: 12px;
        }

        .filters-group select {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #cbd5e1;
          padding: 8px 16px;
          border-radius: 10px;
          outline: none;
          cursor: pointer;
          font-size: 0.9rem;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .btn-block {
          width: 100%;
          margin-top: 15px;
        }

        /* Products Table */
        .table-wrapper {
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.35);
          overflow: hidden;
          padding: 10px;
        }

        .products-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .products-table th {
          padding: 16px 20px;
          color: #94a3b8;
          font-weight: 600;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .products-table td {
          padding: 18px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          vertical-align: middle;
        }

        .product-identity {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .product-name {
          font-weight: 600;
          color: #fff;
          font-size: 0.95rem;
        }

        .product-sku {
          font-size: 0.8rem;
          color: #64748b;
          font-family: monospace;
        }

        .meta-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .badge-meta {
          background: rgba(255, 255, 255, 0.04);
          color: #94a3b8;
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 6px;
          width: max-content;
        }

        .text-secondary {
          font-size: 0.8rem;
          color: #64748b;
        }

        .variants-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          max-width: 320px;
        }

        .pill-variant {
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          color: #c7d2fe;
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .mappings-stack {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .badge-mapping {
          font-size: 0.75rem;
          padding: 4px 10px;
          border-radius: 6px;
          width: max-content;
          font-weight: 500;
        }

        .market-shopee { background: rgba(234, 88, 12, 0.15); border: 1px solid rgba(234, 88, 12, 0.3); color: #ffedd5; }
        .market-lazada { background: rgba(30, 64, 175, 0.15); border: 1px solid rgba(30, 64, 175, 0.3); color: #dbeafe; }
        .market-tiktok { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.15); color: #f8fafc; }

        .status-synced { color: #34d399; font-weight: bold; }
        .status-failed { color: #f87171; font-weight: bold; }
        .status-pending { background: rgba(234, 179, 8, 0.1); color: #fbbf24; border: 1px solid rgba(234, 179, 8, 0.2); }

        .badge-status {
          font-size: 0.75rem;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: bold;
        }
        .status-draft { background: rgba(148, 163, 184, 0.15); color: #94a3b8; }
        .status-active { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .status-archived { background: rgba(239, 68, 68, 0.15); color: #ef4444; }

        .row-actions {
          display: flex;
          gap: 10px;
        }

        .btn-action-icon {
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .btn-action-icon:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-1px);
        }

        .btn-sync-trigger:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
        }

        /* Modal Backdrop */
        .modal-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(5, 8, 16, 0.8);
          backdrop-filter: blur(10px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .modal-content {
          width: 100%;
          max-width: 680px;
          background: #090d16;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        .modal-header, .drawer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .modal-header h2, .drawer-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .btn-close {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 1.8rem;
          cursor: pointer;
          line-height: 1;
        }

        .modal-form, .drawer-form {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
          min-width: 180px;
        }

        .form-group label {
          font-size: 0.85rem;
          color: #94a3b8;
          font-weight: 500;
        }

        .form-group input, .form-group textarea, .form-group select {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 10px 14px;
          border-radius: 8px;
          outline: none;
          font-size: 0.9rem;
        }

        .form-group input:focus, .form-group select:focus {
          border-color: #6366f1;
        }

        /* Variant Creator Box */
        .variant-creator-box {
          border: 1px dashed rgba(255, 255, 255, 0.1);
          padding: 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01);
        }

        .variant-creator-box h3 {
          font-size: 0.9rem;
          color: #cbd5e1;
          margin-bottom: 12px;
        }

        .variant-inline-form {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .variant-inline-form input {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
          flex-grow: 1;
        }

        .btn-add-variant {
          background: #6366f1;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }

        .form-variants-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }

        .form-variants-table th {
          padding: 8px 12px;
          color: #64748b;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          text-align: left;
        }

        .form-variants-table td {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .btn-remove-variant {
          background: transparent;
          border: none;
          color: #f87171;
          cursor: pointer;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        /* Drawer Slide-Out */
        .drawer-backdrop {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(5, 8, 16, 0.7);
          backdrop-filter: blur(5px);
          z-index: 999;
        }

        .drawer-content {
          position: absolute;
          top: 0; right: 0;
          width: 100%;
          max-width: 440px;
          height: 100vh;
          background: #090d16;
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          flex-direction: column;
          animation: slide-in 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .drawer-subtitle {
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.4;
          margin-bottom: 10px;
        }

        /* Loader & Animations */
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #94a3b8;
          gap: 12px;
        }

        .spinner {
          width: 32px;
          height: 32px;
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
          padding: 80px 20px;
          gap: 10px;
          color: #64748b;
        }

        .empty-icon { font-size: 3rem; margin-bottom: 10px; }
        .empty-state h3 { color: #fff; font-size: 1.1rem; font-weight: 600; }

        .toast-alert {
          position: fixed;
          top: 24px;
          right: 24px;
          padding: 16px 24px;
          border-radius: 12px;
          color: #fff;
          z-index: 1100;
          font-weight: 600;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          animation: slide-in 0.2s ease;
        }
        .toast-success { background: #10b981; border: 1px solid rgba(255,255,255,0.1); }
        .toast-error { background: #ef4444; border: 1px solid rgba(255,255,255,0.1); }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slide-down {
          from { transform: translateY(-50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-down { animation: slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

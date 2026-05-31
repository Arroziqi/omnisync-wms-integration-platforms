"use client";

import { useState, useEffect } from 'react';

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface ProductVariant {
  id: string;
  variantSku: string;
  variantName: string;
  price: number;
  productName?: string;
}

interface InventoryItem {
  id: string;
  warehouseId: string;
  variantId: string;
  quantity: number;
  reserved: number;
  available: number;
  updatedAt: string;
  warehouse: { code: string; name: string };
  variant: {
    variantSku: string;
    variantName: string;
    product: { name: string };
  };
}

interface MovementLog {
  id: string;
  type: string;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  description: string;
  createdAt: string;
  warehouse: { code: string };
  variant: { variantSku: string };
  user: { name: string } | null;
}

export default function InventoryPage() {
  const [inventories, setInventories] = useState<InventoryItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [movements, setMovements] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('ALL'); // ALL, LOW, OUT, IN

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal/Drawer States
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);

  // Form parameters
  const [adjustForm, setAdjustForm] = useState({
    warehouseId: '',
    variantId: '',
    quantityDelta: 0,
    description: '',
    type: 'adjustment'
  });

  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: '',
    toWarehouseId: '',
    variantId: '',
    quantity: 1,
    description: ''
  });

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchWarehouses = async (token: string) => {
    try {
      const res = await fetch(`${apiBase}/api/v1/inventory/warehouses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (err) {
      console.error('Error fetching warehouses:', err);
    }
  };

  const fetchVariants = async (token: string) => {
    try {
      const res = await fetch(`${apiBase}/api/v1/products`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Flatten variants
        const flattened: ProductVariant[] = (data.data || []).flatMap((p: any) =>
          (p.variants || []).map((v: any) => ({
            id: v.id,
            variantSku: v.variantSku,
            variantName: v.variantName,
            price: v.price,
            productName: p.name
          }))
        );
        setVariants(flattened);
      }
    } catch (err) {
      console.error('Error fetching variants:', err);
    }
  };

  const fetchInventories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      let queryParams = `page=${page}&limit=10`;
      if (search) queryParams += `&search=${encodeURIComponent(search)}`;
      if (selectedWarehouseId) queryParams += `&warehouseId=${selectedWarehouseId}`;

      const res = await fetch(`${apiBase}/api/v1/inventory?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        // Handle frontend stock level filter
        let filtered = data.data || [];
        if (selectedStockStatus === 'LOW') {
          filtered = filtered.filter((i: InventoryItem) => i.available > 0 && i.available <= 5);
        } else if (selectedStockStatus === 'OUT') {
          filtered = filtered.filter((i: InventoryItem) => i.available === 0);
        } else if (selectedStockStatus === 'IN') {
          filtered = filtered.filter((i: InventoryItem) => i.available > 5);
        }
        setInventories(filtered);
        setTotalPages(data.meta?.totalPages || 1);
      } else {
        showToast('Failed to load stock levels', 'error');
      }
    } catch (err) {
      showToast('Network error loading inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/inventory/movements?limit=15`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMovements(data.data || []);
      }
    } catch (err) {
      console.error('Error loading movements:', err);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token') || '';
    fetchWarehouses(token);
    fetchVariants(token);
  }, []);

  useEffect(() => {
    fetchInventories();
  }, [page, search, selectedWarehouseId, selectedStockStatus]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.warehouseId || !adjustForm.variantId) {
      showToast('Warehouse and Variant must be specified', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/inventory/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          warehouseId: adjustForm.warehouseId,
          variantId: adjustForm.variantId,
          quantityDelta: adjustForm.quantityDelta,
          description: adjustForm.description,
          type: adjustForm.type
        })
      });

      if (res.ok) {
        showToast('Manual stock level adjustment executed!');
        setIsAdjustOpen(false);
        setAdjustForm({ warehouseId: '', variantId: '', quantityDelta: 0, description: '', type: 'adjustment' });
        fetchInventories();
      } else {
        const err = await res.json();
        showToast(err.message || 'Deduction/Addition failed', 'error');
      }
    } catch (err) {
      showToast('Network error during adjustment', 'error');
    }
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.fromWarehouseId || !transferForm.toWarehouseId || !transferForm.variantId) {
      showToast('Source, destination and variant are required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/inventory/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fromWarehouseId: transferForm.fromWarehouseId,
          toWarehouseId: transferForm.toWarehouseId,
          variantId: transferForm.variantId,
          quantity: transferForm.quantity,
          description: transferForm.description
        })
      });

      if (res.ok) {
        showToast('Inter-warehouse stock transfer accomplished successfully!');
        setIsTransferOpen(false);
        setTransferForm({ fromWarehouseId: '', toWarehouseId: '', variantId: '', quantity: 1, description: '' });
        fetchInventories();
      } else {
        const err = await res.json();
        showToast(err.message || 'Transfer failed', 'error');
      }
    } catch (err) {
      showToast('Network error during transfer', 'error');
    }
  };

  // Metrics
  const totalPhysical = inventories.reduce((sum, item) => sum + item.quantity, 0);
  const totalReserved = inventories.reduce((sum, item) => sum + item.reserved, 0);
  const totalAvailable = inventories.reduce((sum, item) => sum + item.available, 0);
  const lowStockCount = inventories.filter(item => item.available > 0 && item.available <= 5).length;

  return (
    <div className="inventory-page-container">
      {/* Toast alert */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Metrics Header */}
      <section className="metrics-grid">
        <div className="metric-card glass-card">
          <div className="metric-icon blue-glow">📦</div>
          <div className="metric-info">
            <span className="metric-value">{totalPhysical}</span>
            <span className="metric-label">Physical Stock Units</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon yellow-glow">🔒</div>
          <div className="metric-info">
            <span className="metric-value">{totalReserved}</span>
            <span className="metric-label">Reserved Units</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon green-glow">✅</div>
          <div className="metric-info">
            <span className="metric-value">{totalAvailable}</span>
            <span className="metric-label">Net Available Stock</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon red-glow">⚠️</div>
          <div className="metric-info">
            <span className="metric-value">{lowStockCount}</span>
            <span className="metric-label">Low Stock Alerts</span>
          </div>
        </div>
      </section>

      {/* Controls & Actions */}
      <section className="controls-panel glass-card">
        <div className="filters-left">
          <input
            type="text"
            className="filter-search"
            placeholder="Search SKU or Variant Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="filter-select"
            value={selectedWarehouseId}
            onChange={(e) => setSelectedWarehouseId(e.target.value)}
          >
            <option value="">All Warehouses</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name} ({wh.code})
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedStockStatus}
            onChange={(e) => setSelectedStockStatus(e.target.value)}
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="IN">In Stock (&gt; 5)</option>
            <option value="LOW">Low Stock (1-5)</option>
            <option value="OUT">Out of Stock (0)</option>
          </select>
        </div>

        <div className="actions-right">
          <button className="btn-secondary" onClick={() => { fetchMovements(); setIsLogsOpen(true); }}>
            📜 Audit Logs
          </button>
          <button className="btn-action-glow" onClick={() => setIsTransferOpen(true)}>
            🔄 Stock Transfer
          </button>
          <button className="btn-primary" onClick={() => setIsAdjustOpen(true)}>
            ➕ Manual Adjust
          </button>
        </div>
      </section>

      {/* Main Stock Table */}
      <section className="table-wrapper glass-card">
        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Scanning global supply networks...</p>
          </div>
        ) : inventories.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <h3>No Inventory records found</h3>
            <p>Try clearing filters or add a manual stock level adjustment.</p>
          </div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Master Product / Variant SKU</th>
                <th>Warehouse</th>
                <th>Physical Stock</th>
                <th>Reserved Stock</th>
                <th>Net Available</th>
                <th>Stock Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventories.map((item) => {
                let statusLabel = 'In Stock';
                let statusClass = 'badge-success';
                if (item.available === 0) {
                  statusLabel = 'Out of Stock';
                  statusClass = 'badge-danger';
                } else if (item.available <= 5) {
                  statusLabel = 'Low Stock';
                  statusClass = 'badge-warning';
                }

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="item-sku-group">
                        <span className="p-name">{item.variant?.product?.name || 'Master Product'}</span>
                        <span className="v-sku"><code>{item.variant?.variantSku}</code></span>
                        <span className="v-name">{item.variant?.variantName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="wh-tag">🏢 {item.warehouse?.name}</span>
                    </td>
                    <td className="text-bold">{item.quantity}</td>
                    <td className="text-muted">{item.reserved}</td>
                    <td className="text-bold text-available">{item.available}</td>
                    <td>
                      <span className={`badge-status ${statusClass}`}>{statusLabel}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button 
                          className="btn-tiny btn-tiny-adjust"
                          onClick={() => {
                            setAdjustForm({
                              ...adjustForm,
                              warehouseId: item.warehouseId,
                              variantId: item.variantId
                            });
                            setIsAdjustOpen(true);
                          }}
                        >
                          Adjust
                        </button>
                        <button 
                          className="btn-tiny btn-tiny-transfer"
                          onClick={() => {
                            setTransferForm({
                              ...transferForm,
                              fromWarehouseId: item.warehouseId,
                              variantId: item.variantId
                            });
                            setIsTransferOpen(true);
                          }}
                        >
                          Transfer
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="table-pagination">
            <button className="btn-pag" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Prev
            </button>
            <span className="pag-label">Page {page} of {totalPages}</span>
            <button className="btn-pag" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          </div>
        )}
      </section>

      {/* Manual Stock Level Adjust Modal */}
      {isAdjustOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-down">
            <div className="modal-header">
              <h2>Inventory Level Adjustment</h2>
              <button className="btn-close" onClick={() => setIsAdjustOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAdjustSubmit} className="modal-form">
              <div className="form-group">
                <label>Warehouse Storage *</label>
                <select
                  required
                  value={adjustForm.warehouseId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                >
                  <option value="">Choose Warehouse...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Product SKU Variant *</label>
                <select
                  required
                  value={adjustForm.variantId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, variantId: e.target.value })}
                >
                  <option value="">Choose Variant...</option>
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.productName} — {v.variantName} ({v.variantSku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label>Adjustment Type</label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                  >
                    <option value="adjustment">Manual Adjustment</option>
                    <option value="receipt">Stock Receipt (Purchase)</option>
                    <option value="return">Customer Return</option>
                    <option value="sale">Manual Sale Deduction</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity Delta *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. +10 or -5"
                    value={adjustForm.quantityDelta || ''}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantityDelta: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description / Reason</label>
                <textarea
                  rows={2}
                  placeholder="Reason for stock adjustments..."
                  value={adjustForm.description}
                  onChange={(e) => setAdjustForm({ ...adjustForm, description: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAdjustOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Transfer Modal */}
      {isTransferOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-down">
            <div className="modal-header">
              <h2>Inter-Warehouse Stock Transfer</h2>
              <button className="btn-close" onClick={() => setIsTransferOpen(false)}>×</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="modal-form">
              <div className="form-group">
                <label>Source Warehouse *</label>
                <select
                  required
                  value={transferForm.fromWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })}
                >
                  <option value="">Choose Source Warehouse...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Destination Warehouse *</label>
                <select
                  required
                  value={transferForm.toWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                >
                  <option value="">Choose Destination Warehouse...</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Product Variant *</label>
                <select
                  required
                  value={transferForm.variantId}
                  onChange={(e) => setTransferForm({ ...transferForm, variantId: e.target.value })}
                >
                  <option value="">Choose Variant...</option>
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.productName} — {v.variantName} ({v.variantSku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity to Transfer *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={transferForm.quantity || ''}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                />
              </div>

              <div className="form-group">
                <label>Transfer Notes / Reason</label>
                <textarea
                  rows={2}
                  placeholder="Reason for transfer..."
                  value={transferForm.description}
                  onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsTransferOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Historical Audit Logs Modal */}
      {isLogsOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-down modal-logs-content">
            <div className="modal-header">
              <h2>Inventory Movement History (Audit Logs)</h2>
              <button className="btn-close" onClick={() => setIsLogsOpen(false)}>×</button>
            </div>
            
            <div className="audit-logs-table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Warehouse</th>
                    <th>Variant SKU</th>
                    <th>Change Type</th>
                    <th>Quantity Delta</th>
                    <th>Auditor / User</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted">No physical movement events captured yet.</td>
                    </tr>
                  ) : (
                    movements.map((log) => {
                      const isPositive = log.quantityDelta > 0;
                      let typeLabel = log.type.toUpperCase();
                      return (
                        <tr key={log.id}>
                          <td>{new Date(log.createdAt).toLocaleString()}</td>
                          <td><code>{log.warehouse?.code}</code></td>
                          <td><code>{log.variant?.variantSku}</code></td>
                          <td>
                            <span className={`log-type-tag type-${log.type}`}>
                              {typeLabel}
                            </span>
                          </td>
                          <td className={`text-bold ${isPositive ? 'text-green' : 'text-red'}`}>
                            {isPositive ? `+${log.quantityDelta}` : log.quantityDelta}
                          </td>
                          <td>{log.user?.name || 'WMS Service'}</td>
                          <td className="text-small text-muted">{log.description}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setIsLogsOpen(false)}>
                Close Audits
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Styled Sheets */}
      <style jsx global>{`
        .inventory-page-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: #f8fafc;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        .yellow-glow { background: rgba(245, 158, 11, 0.15); box-shadow: 0 0 15px rgba(245, 158, 11, 0.2); }
        .green-glow { background: rgba(16, 185, 129, 0.15); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
        .red-glow { background: rgba(239, 68, 68, 0.15); box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }

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
          flex-wrap: wrap;
          gap: 16px;
          padding: 16px 24px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.4);
        }

        .filters-left {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .filter-search {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 9px 14px;
          border-radius: 10px;
          font-size: 0.9rem;
          outline: none;
          min-width: 240px;
          transition: all 0.2s ease;
        }

        .filter-search:focus {
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.06);
        }

        .filter-select {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 9px 14px;
          border-radius: 10px;
          font-size: 0.9rem;
          outline: none;
          cursor: pointer;
        }

        .actions-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Inventory Table */
        .table-wrapper {
          padding: 24px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .inventory-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .inventory-table th {
          padding: 16px;
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .inventory-table td {
          padding: 16px;
          font-size: 0.92rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          vertical-align: middle;
        }

        .inventory-table tr:hover td {
          background: rgba(255, 255, 255, 0.01);
        }

        .item-sku-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .p-name {
          font-weight: 600;
          color: #fff;
        }

        .v-sku code {
          font-family: monospace;
          color: #818cf8;
          font-size: 0.8rem;
        }

        .v-name {
          font-size: 0.8rem;
          color: #64748b;
        }

        .wh-tag {
          font-size: 0.88rem;
          color: #cbd5e1;
        }

        .text-bold {
          font-weight: 700;
          color: #fff;
        }

        .text-muted {
          color: #475569;
        }

        .text-available {
          color: #34d399;
          font-size: 1rem;
        }

        .badge-status {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          letter-spacing: 0.03em;
        }

        .badge-success { background: rgba(16, 185, 129, 0.12); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        .badge-warning { background: rgba(245, 158, 11, 0.12); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.2); }
        .badge-danger { background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }

        .row-actions {
          display: flex;
          gap: 8px;
        }

        .btn-tiny {
          font-size: 0.75rem;
          font-weight: 700;
          padding: 5px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .btn-tiny-adjust {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border-color: rgba(99, 102, 241, 0.2);
        }

        .btn-tiny-adjust:hover {
          background: #4f46e5;
          color: #fff;
        }

        .btn-tiny-transfer {
          background: rgba(6, 182, 212, 0.1);
          color: #22d3ee;
          border-color: rgba(6, 182, 212, 0.2);
        }

        .btn-tiny-transfer:hover {
          background: #0891b2;
          color: #fff;
        }

        /* Pagination */
        .table-pagination {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
        }

        .btn-pag {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.85rem;
        }

        .btn-pag:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pag-label {
          font-size: 0.85rem;
          color: #64748b;
        }

        /* Primary Buttons */
        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
        }

        .btn-primary:hover {
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
        }

        .btn-action-glow {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(6, 182, 212, 0.35);
        }

        .btn-action-glow:hover {
          box-shadow: 0 6px 20px rgba(6, 182, 212, 0.5);
        }

        .btn-secondary {
          background: rgba(255, 255, 255, 0.04);
          color: #f8fafc;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        /* Spinner & Empty State */
        .loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          color: #64748b;
          gap: 12px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 2px solid rgba(99, 102, 241, 0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          text-align: center;
          gap: 12px;
        }

        .empty-icon { font-size: 2.5rem; opacity: 0.6; }
        .empty-state h3 { font-size: 1.15rem; color: #fff; }
        .empty-state p { font-size: 0.88rem; color: #64748b; }

        /* Modals & Backdrop */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(2, 4, 8, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          width: 100%;
          max-width: 480px;
          padding: 30px;
          background: rgba(10, 15, 30, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          position: relative;
        }

        .modal-logs-content {
          max-width: 900px;
          width: 90%;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .btn-close {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 1.7rem;
          cursor: pointer;
          line-height: 1;
        }

        .btn-close:hover { color: #fff; }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 0.88rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .form-group input, .form-group textarea, .form-group select {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 10px 14px;
          border-radius: 8px;
          outline: none;
          font-size: 0.92rem;
          transition: all 0.2s ease;
        }

        .form-group select option {
          background: #0f172a;
          color: #fff;
        }

        .form-group input:focus, .form-group textarea:focus, .form-group select:focus {
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.06);
        }

        .form-row-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

        /* Audit Logs Specific */
        .audit-logs-table-wrapper {
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 20px;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .audit-table th {
          background: rgba(15, 23, 42, 0.8);
          padding: 12px 16px;
          font-size: 0.78rem;
          color: #64748b;
          font-weight: 700;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          position: sticky;
          top: 0;
        }

        .audit-table td {
          padding: 12px 16px;
          font-size: 0.85rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .log-type-tag {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .type-adjustment { background: rgba(59, 130, 246, 0.12); color: #60a5fa; }
        .type-transfer_in { background: rgba(16, 185, 129, 0.12); color: #34d399; }
        .type-transfer_out { background: rgba(239, 68, 68, 0.12); color: #f87171; }
        .type-receipt { background: rgba(139, 92, 246, 0.12); color: #a78bfa; }
        .type-return { background: rgba(245, 158, 11, 0.12); color: #fbbf24; }

        .text-green { color: #34d399; }
        .text-red { color: #f87171; }
        .text-center { text-align: center; }
        .text-small { font-size: 0.8rem; }

        /* Toast Alert */
        .toast-alert {
          position: fixed;
          bottom: 24px;
          right: 24px;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.92rem;
          z-index: 1100;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          animation: slide-up-fade-in 0.3s ease;
        }

        .toast-success {
          background: rgba(16, 185, 129, 0.95);
          border: 1px solid rgba(52, 211, 153, 0.2);
          color: #fff;
        }

        .toast-error {
          background: rgba(239, 68, 68, 0.95);
          border: 1px solid rgba(248, 113, 113, 0.2);
          color: #fff;
        }

        @keyframes slide-up-fade-in {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes slide-down {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

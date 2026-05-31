"use client";

import { useState, useEffect } from 'react';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
  totalVariants: number;
  totalPhysicalStock: number;
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form States
  const [newWarehouse, setNewWarehouse] = useState({ code: '', name: '', address: '', isActive: true });
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/inventory/warehouses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      } else {
        showToast('Failed to fetch warehouses list', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while loading warehouses', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWarehouse.code || !newWarehouse.name) {
      showToast('Warehouse Code and Name are required', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/inventory/warehouses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newWarehouse)
      });

      if (res.ok) {
        showToast('Warehouse facility registered successfully!');
        setIsAddModalOpen(false);
        setNewWarehouse({ code: '', name: '', address: '', isActive: true });
        fetchWarehouses();
      } else {
        const err = await res.json();
        showToast(err.message || 'Error creating warehouse', 'error');
      }
    } catch (_err) {
      showToast('Network error while creating warehouse', 'error');
    }
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouse) return;

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/inventory/warehouses/${editingWarehouse.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: editingWarehouse.code,
          name: editingWarehouse.name,
          address: editingWarehouse.address,
          isActive: editingWarehouse.isActive
        })
      });

      if (res.ok) {
        showToast('Warehouse parameters updated successfully!');
        setIsEditModalOpen(false);
        setEditingWarehouse(null);
        fetchWarehouses();
      } else {
        const err = await res.json();
        showToast(err.message || 'Error updating warehouse', 'error');
      }
    } catch (_err) {
      showToast('Network error while updating warehouse', 'error');
    }
  };

  const handleToggleActive = async (warehouse: Warehouse) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${apiBase}/api/v1/inventory/warehouses/${warehouse.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !warehouse.isActive })
      });

      if (res.ok) {
        showToast(`Warehouse "${warehouse.code}" is now ${!warehouse.isActive ? 'Active' : 'Inactive'}.`);
        fetchWarehouses();
      } else {
        showToast('Failed to toggle warehouse active state', 'error');
      }
    } catch (_err) {
      showToast('Network error on state toggle', 'error');
    }
  };

  // Metrics
  const activeCount = warehouses.filter(w => w.isActive).length;
  const totalPhysical = warehouses.reduce((sum, w) => sum + w.totalPhysicalStock, 0);

  return (
    <div className="warehouses-page-container">
      {/* Toast */}
      {toast && (
        <div className={`toast-alert toast-${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Metrics Panel */}
      <section className="metrics-grid">
        <div className="metric-card glass-card">
          <div className="metric-icon blue-glow">🏢</div>
          <div className="metric-info">
            <span className="metric-value">{warehouses.length}</span>
            <span className="metric-label">Total Warehouses</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon green-glow">🟢</div>
          <div className="metric-info">
            <span className="metric-value">{activeCount}</span>
            <span className="metric-label">Active Facilities</span>
          </div>
        </div>

        <div className="metric-card glass-card">
          <div className="metric-icon cyan-glow">📦</div>
          <div className="metric-info">
            <span className="metric-value">{totalPhysical}</span>
            <span className="metric-label">Aggregated Stock Units</span>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section className="controls-panel glass-card">
        <h2 className="section-title">Physical Supply Locations</h2>
        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
          ➕ Register Warehouse
        </button>
      </section>

      {/* Warehouse Grid List */}
      <section className="warehouses-grid">
        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Scanning supply chain network...</p>
          </div>
        ) : warehouses.length === 0 ? (
          <div className="empty-state glass-card">
            <span className="empty-icon">🏢</span>
            <h3>No Warehouses Registered</h3>
            <p>Add a physical warehouse to begin receiving inventory items.</p>
          </div>
        ) : (
          warehouses.map((wh) => (
            <div key={wh.id} className={`warehouse-card glass-card ${!wh.isActive ? 'inactive-card' : ''}`}>
              <div className="card-header">
                <span className="wh-code"><code>{wh.code}</code></span>
                <span className={`badge-status ${wh.isActive ? 'status-active' : 'status-inactive'}`}>
                  {wh.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <h3 className="wh-name">{wh.name}</h3>
              <p className="wh-address">{wh.address || 'No address provided.'}</p>
              
              <div className="wh-stats">
                <div className="stat-item">
                  <span className="stat-val">{wh.totalVariants}</span>
                  <span className="stat-lbl">SKUs Tracked</span>
                </div>
                <div className="stat-item">
                  <span className="stat-val">{wh.totalPhysicalStock}</span>
                  <span className="stat-lbl">Physical Units</span>
                </div>
              </div>

              <div className="card-actions">
                <button 
                  className={`btn-action-outline ${wh.isActive ? 'btn-deactivate' : 'btn-activate'}`}
                  onClick={() => handleToggleActive(wh)}
                >
                  {wh.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  className="btn-action-primary"
                  onClick={() => {
                    setEditingWarehouse(wh);
                    setIsEditModalOpen(true);
                  }}
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-down">
            <div className="modal-header">
              <h2>Register Warehouse Facility</h2>
              <button className="btn-close" onClick={() => setIsAddModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="modal-form">
              <div className="form-group">
                <label>Warehouse Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-JKT-03"
                  value={newWarehouse.code}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Warehouse Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. West Jakarta Hub"
                  value={newWarehouse.name}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  placeholder="Full physical address..."
                  rows={3}
                  value={newWarehouse.address}
                  onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingWarehouse && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card animate-slide-down">
            <div className="modal-header">
              <h2>Edit Warehouse Parameters</h2>
              <button className="btn-close" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateWarehouse} className="modal-form">
              <div className="form-group">
                <label>Warehouse Code *</label>
                <input
                  type="text"
                  required
                  value={editingWarehouse.code}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, code: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={editingWarehouse.name}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  rows={3}
                  value={editingWarehouse.address || ''}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, address: e.target.value })}
                />
              </div>

              <div className="form-group inline-checkbox">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editingWarehouse.isActive}
                  onChange={(e) => setEditingWarehouse({ ...editingWarehouse, isActive: e.target.checked })}
                />
                <label htmlFor="edit-is-active">Active and open for inventory storage</label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Styled Sheets */}
      <style jsx global>{`
        .warehouses-page-container {
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
        .green-glow { background: rgba(16, 185, 129, 0.15); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
        .cyan-glow { background: rgba(6, 182, 212, 0.15); box-shadow: 0 0 15px rgba(6, 182, 212, 0.2); }

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

        /* Controls */
        .controls-panel {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.4);
        }

        .section-title {
          font-size: 1.2rem;
          font-weight: 600;
          color: #fff;
        }

        /* Warehouses Grid */
        .warehouses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
          min-height: 200px;
        }

        .warehouse-card {
          display: flex;
          flex-direction: column;
          padding: 24px;
          border-radius: 16px;
          background: rgba(15, 23, 42, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: all 0.25s ease;
          position: relative;
        }

        .warehouse-card:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.2);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
        }

        .inactive-card {
          opacity: 0.65;
          background: rgba(15, 23, 42, 0.2);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .wh-code code {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 0.85rem;
          color: #818cf8;
        }

        .badge-status {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 20px;
          letter-spacing: 0.03em;
        }

        .status-active {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }

        .status-inactive {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }

        .wh-name {
          font-size: 1.15rem;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
        }

        .wh-address {
          font-size: 0.88rem;
          color: #94a3b8;
          line-height: 1.4;
          margin-bottom: 24px;
          min-height: 38px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .wh-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 16px 0;
          margin-bottom: 20px;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-item:first-child {
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .stat-val {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .stat-lbl {
          font-size: 0.78rem;
          color: #64748b;
          margin-top: 4px;
        }

        .card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: auto;
        }

        .btn-action-primary {
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-action-primary:hover {
          background: #4f46e5;
          color: #fff;
          border-color: #4f46e5;
        }

        .btn-action-outline {
          background: transparent;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 600;
          font-size: 0.88rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .btn-deactivate {
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.15);
          background: rgba(239, 68, 68, 0.04);
        }

        .btn-deactivate:hover {
          background: rgba(239, 68, 68, 0.15);
        }

        .btn-activate {
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.15);
          background: rgba(16, 185, 129, 0.04);
        }

        .btn-activate:hover {
          background: rgba(16, 185, 129, 0.15);
        }

        /* Buttons & Forms */
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

        /* Loader & Empty States */
        .loader-container {
          grid-column: 1 / -1;
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
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          text-align: center;
          gap: 12px;
          background: rgba(15, 23, 42, 0.2);
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
          transition: color 0.2s ease;
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

        .form-group input, .form-group textarea {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 10px 14px;
          border-radius: 8px;
          outline: none;
          font-size: 0.92rem;
          transition: all 0.2s ease;
        }

        .form-group input:focus, .form-group textarea:focus {
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.06);
        }

        .inline-checkbox {
          flex-direction: row;
          align-items: center;
          gap: 10px;
        }

        .inline-checkbox input {
          cursor: pointer;
        }

        .inline-checkbox label {
          cursor: pointer;
          user-select: none;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }

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

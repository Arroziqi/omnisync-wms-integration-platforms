"use client";

import { useEffect, useState } from 'react';

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Permission {
  id: string;
  key: string;
  description: string;
}

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Role creation states
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  const fetchRolesAndPermissions = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const [rolesRes, permsRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/roles`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiBase}/api/v1/roles/permissions`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!rolesRes.ok || !permsRes.ok) {
        throw new Error('Failed to fetch system security catalog');
      }

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      setRoles(rolesData);
      setPermissions(permsData);

      if (rolesData.length > 0 && !selectedRoleId) {
        setSelectedRoleId(rolesData[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with WMS security pipeline');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedPermissions = async (roleId: string) => {
    if (!roleId) return;
    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const res = await fetch(`${apiBase}/api/v1/roles/${roleId}/permissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to resolve role assignments');

      const data = await res.json();
      setSelectedPermissionIds(data.permissionIds);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchRolesAndPermissions();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      fetchAssignedPermissions(selectedRoleId);
      setSuccess('');
    }
  }, [selectedRoleId]);

  const handlePermissionToggle = (permId: string) => {
    // If selected role is admin, let user know permissions are unchangeable/implicit
    const selectedRoleObj = roles.find(r => r.id === selectedRoleId);
    if (selectedRoleObj?.name.toLowerCase() === 'admin') {
      setError('Admin role holds absolute implicit permissions and cannot be modified.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (selectedPermissionIds.includes(permId)) {
      setSelectedPermissionIds(selectedPermissionIds.filter(id => id !== permId));
    } else {
      setSelectedPermissionIds([...selectedPermissionIds, permId]);
    }
  };

  const handleSaveChanges = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const res = await fetch(`${apiBase}/api/v1/roles/${selectedRoleId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ permissionIds: selectedPermissionIds })
      });

      if (!res.ok) throw new Error('Failed to save permissions');

      setSuccess('Permissions assigned and synchronized successfully.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const res = await fetch(`${apiBase}/api/v1/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create security role');

      setShowAddRoleModal(false);
      setNewRoleName('');
      setNewRoleDesc('');
      
      // Reload roles and auto-select new role
      await fetchRolesAndPermissions();
      setSelectedRoleId(data.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group permissions logically by prefix (e.g. "users", "roles", "marketplace")
  const getCategorizedPermissions = () => {
    const categories: { [key: string]: Permission[] } = {};
    permissions.forEach((perm) => {
      const prefix = perm.key.split(':')[0] || 'general';
      if (!categories[prefix]) categories[prefix] = [];
      categories[prefix].push(perm);
    });
    return categories;
  };

  if (loading) {
    return <div className="loading-state"><span className="spinner"></span></div>;
  }

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const categorized = getCategorizedPermissions();

  return (
    <div className="roles-page">
      <div className="grid-layout">
        {/* Roles Sidebar */}
        <div className="glass-card roles-sidebar">
          <div className="sidebar-header">
            <h3 className="section-title gradient-text">Security Roles</h3>
            <button onClick={() => setShowAddRoleModal(true)} className="btn-icon-only" title="Create new role">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          <div className="roles-list">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`role-select-item ${role.id === selectedRoleId ? 'active' : ''}`}
              >
                <div className="role-meta">
                  <span className="role-name">{role.name.toUpperCase()}</span>
                  <span className="role-desc">{role.description}</span>
                </div>
                {role.name.toLowerCase() === 'admin' && (
                  <span className="badge badge-info admin-badge">Absolute</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Grid */}
        <div className="glass-card permissions-card">
          <div className="permissions-header">
            <div>
              <h2 className="section-title gradient-text">Configure Role Access: {selectedRole?.name.toUpperCase()}</h2>
              <p className="section-desc">{selectedRole?.description || 'Select a role to configure parameters.'}</p>
            </div>
            <button
              onClick={handleSaveChanges}
              disabled={saving || selectedRole?.name.toLowerCase() === 'admin'}
              className="btn-primary"
            >
              {saving ? <span className="spinner small-spinner"></span> : <span>Save Access Configurations</span>}
            </button>
          </div>

          {error && <div className="error-alert"><span>{error}</span></div>}
          {success && <div className="success-alert"><span>{success}</span></div>}

          {selectedRole?.name.toLowerCase() === 'admin' ? (
            <div className="admin-notice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" /><path d="M12 8h.01" />
              </svg>
              <div>
                <h4>System Root Admin Control</h4>
                <p>The Admin role holds all functional permission keys by default. Assignment configuration is lock-restricted.</p>
              </div>
            </div>
          ) : null}

          <div className="permissions-matrix">
            {Object.keys(categorized).map((category) => (
              <div key={category} className="category-group">
                <h4 className="category-title">{category.toUpperCase()} MANAGEMENT</h4>
                <div className="permissions-grid">
                  {categorized[category].map((perm) => {
                    const isChecked = selectedRole?.name.toLowerCase() === 'admin' || selectedPermissionIds.includes(perm.id);
                    return (
                      <label
                        key={perm.id}
                        className={`permission-grid-item ${isChecked ? 'selected' : ''} ${selectedRole?.name.toLowerCase() === 'admin' ? 'disabled' : ''}`}
                      >
                        <div className="checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handlePermissionToggle(perm.id)}
                            disabled={selectedRole?.name.toLowerCase() === 'admin'}
                          />
                          <span className="checkbox-visual"></span>
                        </div>
                        <div className="permission-info">
                          <span className="permission-key">{perm.key}</span>
                          <span className="permission-desc">{perm.description}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- ADD ROLE MODAL --- */}
      {showAddRoleModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <h3 className="gradient-text modal-title">Create New Access Role</h3>
            <form onSubmit={handleAddRoleSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Role Name (key identifier)</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. support, manager"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Functional department or operational level"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddRoleModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Initialize Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .roles-page {
          height: 100%;
        }

        .grid-layout {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 20px;
          height: 100%;
          align-items: start;
        }

        .roles-sidebar {
          padding: 24px;
          background: rgba(16, 22, 38, 0.4);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-title {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .roles-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .role-select-item {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
        }

        .role-select-item:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .role-select-item.active {
          background: rgba(99, 102, 241, 0.12);
          border-color: rgba(99, 102, 241, 0.25);
        }

        .role-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 160px;
        }

        .role-name {
          font-size: 0.9rem;
          font-weight: 700;
          color: #f1f5f9;
        }

        .role-desc {
          font-size: 0.78rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .admin-badge {
          font-size: 0.65rem;
        }

        .btn-icon-only {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #94a3b8;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .btn-icon-only:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.05);
        }

        .permissions-card {
          padding: 30px;
          background: rgba(16, 22, 38, 0.4);
        }

        .permissions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 20px;
          gap: 20px;
        }

        .section-desc {
          font-size: 0.88rem;
          color: #64748b;
          margin-top: 4px;
        }

        .success-alert {
          background: rgba(16, 185, 129, 0.09);
          border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: #a7f3d0;
          font-size: 0.88rem;
          margin-bottom: 20px;
        }

        .admin-notice {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .admin-notice svg {
          width: 24px;
          height: 24px;
          color: #6366f1;
          flex-shrink: 0;
        }

        .admin-notice h4 {
          font-size: 0.9rem;
          font-weight: 700;
          color: #f8fafc;
        }

        .admin-notice p {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 2px;
        }

        .permissions-matrix {
          display: flex;
          flex-direction: column;
          gap: 28px;
          max-height: calc(100vh - 280px);
          overflow-y: auto;
          padding-right: 8px;
        }

        .category-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .category-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.08em;
          border-left: 2px solid #6366f1;
          padding-left: 8px;
        }

        .permissions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .permission-grid-item {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          gap: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .permission-grid-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .permission-grid-item.selected {
          background: rgba(99, 102, 241, 0.06);
          border-color: rgba(99, 102, 241, 0.15);
        }

        .permission-grid-item.disabled {
          cursor: not-allowed;
        }

        .checkbox-wrapper {
          position: relative;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .checkbox-wrapper input {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .checkbox-visual {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: 1.5px solid #475569;
          border-radius: 4px;
          transition: all 0.15s ease;
          background: transparent;
        }

        .permission-grid-item.selected .checkbox-visual {
          background: #6366f1;
          border-color: #6366f1;
        }

        .permission-grid-item.selected .checkbox-visual::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 5px;
          height: 9px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .permission-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .permission-key {
          font-size: 0.88rem;
          font-weight: 600;
          color: #e2e8f0;
          word-break: break-all;
        }

        .permission-desc {
          font-size: 0.78rem;
          color: #64748b;
        }

        .loading-state {
          display: flex;
          justify-content: center;
          padding: 60px;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(99, 102, 241, 0.1);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .small-spinner {
          width: 18px;
          height: 18px;
          border-width: 2px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Modal Styles */
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(5, 7, 15, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
        }

        .modal-content {
          width: 100%;
          max-width: 440px;
          background: rgba(16, 22, 38, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 24px;
          text-align: center;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}

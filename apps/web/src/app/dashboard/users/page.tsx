"use client";

import { useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  roleId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  role?: { id: string; name: string } | null;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchUsersAndRoles = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${apiBase}/api/v1/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiBase}/api/v1/roles`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!usersRes.ok || !rolesRes.ok) {
        throw new Error('Failed to load user or role metadata');
      }

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.message || 'Error communicating with WMS core API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRoleId('');
    setIsActive(true);
    setError('');
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const response = await fetch(`${apiBase}/api/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          password,
          roleId: roleId || undefined,
          isActive
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create operator');
      }

      setShowAddModal(false);
      resetForm();
      fetchUsersAndRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEditClick = (user: User) => {
    setCurrentUser(user);
    setName(user.name);
    setEmail(user.email);
    setRoleId(user.roleId || '');
    setIsActive(user.isActive);
    setShowEditModal(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const response = await fetch(`${apiBase}/api/v1/users/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          email,
          password: password || undefined,
          roleId: roleId || null,
          isActive
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update operator details');
      }

      setShowEditModal(false);
      resetForm();
      setCurrentUser(null);
      fetchUsersAndRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteClick = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this operator? This action is permanent.')) return;
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

      const response = await fetch(`${apiBase}/api/v1/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete operator');
      }

      fetchUsersAndRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return <div className="loading-state"><span className="spinner"></span></div>;
  }

  return (
    <div className="users-page glass-card">
      <div className="page-actions-header">
        <h2 className="section-title gradient-text">Configure Integration Operators</h2>
        <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '18px', height: '18px' }}>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Register Operator</span>
        </button>
      </div>

      {error && <div className="error-alert"><span>{error}</span></div>}

      <div className="table-wrapper">
        <table className="modern-table">
          <thead>
            <tr>
              <th>Operator Details</th>
              <th>System Role</th>
              <th>Status</th>
              <th>Last Sign-In</th>
              <th>Created On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#64748b' }}>No operators configured.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <span className="user-display-name">{user.name}</span>
                      <span className="user-email">{user.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-info">{user.role?.name || 'No Role'}</span>
                  </td>
                  <td>
                    {user.isActive ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-error">Suspended</span>
                    )}
                  </td>
                  <td>
                    <span className="date-cell">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </span>
                  </td>
                  <td>
                    <span className="date-cell">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEditClick(user)} className="btn-icon-only edit-btn" title="Edit operator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteClick(user.id)} className="btn-icon-only delete-btn" title="Delete operator">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- ADD USER MODAL --- */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <h3 className="gradient-text modal-title">Register Integration Operator</h3>
            <form onSubmit={handleAddUserSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Security Password (min 6 chars)</label>
                <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Access Role Mapping</label>
                <select className="form-input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">Choose System Role...</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name.toUpperCase()} - {r.description}</option>)}
                </select>
              </div>
              <div className="form-group row-group">
                <input type="checkbox" id="isActiveAdd" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <label htmlFor="isActiveAdd" style={{ cursor: 'pointer' }}>Enable active operator permissions</label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Register Operator</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card">
            <h3 className="gradient-text modal-title">Modify Operator Specifications</h3>
            <form onSubmit={handleEditUserSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Security Password (leave empty to keep current)</label>
                <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="Unmodified" />
              </div>
              <div className="form-group">
                <label className="form-label">Access Role Mapping</label>
                <select className="form-input" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  <option value="">No Role / Viewer</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.name.toUpperCase()} - {r.description}</option>)}
                </select>
              </div>
              <div className="form-group row-group">
                <input type="checkbox" id="isActiveEdit" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                <label htmlFor="isActiveEdit" style={{ cursor: 'pointer' }}>Enable active operator permissions</label>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => { setShowEditModal(false); setCurrentUser(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Specifications</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .users-page {
          background: rgba(16, 22, 38, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .page-actions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .user-info {
          display: flex;
          flex-direction: column;
        }

        .user-display-name {
          font-weight: 600;
          color: #f1f5f9;
          font-size: 0.95rem;
        }

        .user-email {
          font-size: 0.8rem;
          color: #64748b;
        }

        .date-cell {
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .btn-icon-only {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .edit-btn { color: #38bdf8; }
        .edit-btn:hover { background: rgba(56, 189, 248, 0.1); }

        .delete-btn { color: #f87171; }
        .delete-btn:hover { background: rgba(248, 113, 113, 0.1); }

        .btn-icon-only :global(svg) {
          width: 18px;
          height: 18px;
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
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          width: 100%;
          max-width: 480px;
          background: rgba(16, 22, 38, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 32px;
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

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

        .row-group {
          flex-direction: row;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: #94a3b8;
        }

        .row-group input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: #6366f1;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 12px;
        }

        select.form-input {
          appearance: none;
          background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' xmlns='http://www.w3.org/2000/svg'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 16px center;
          background-size: 16px;
          padding-right: 40px;
          color: #f8fafc;
        }

        select.form-input option {
          background-color: #101626;
          color: #f8fafc;
        }
      `}</style>
    </div>
  );
}

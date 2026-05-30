"use client";

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ name: string; email: string; role?: { name: string } } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.replace('/login');
      return;
    }

    // Fetch user details
    const fetchUser = async () => {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
        const response = await fetch(`${apiBase}/api/v1/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Session expired');
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        // Clear expired auth and redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (token && refreshToken) {
      try {
        const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
        await fetch(`${apiBase}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ refresh_token: refreshToken })
        });
      } catch (err) {
        console.error('Logout error', err);
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="layout-loader">
        <div className="spinner"></div>
        <p>Loading Workspace...</p>
        <style jsx>{`
          .layout-loader {
            height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background-color: #090d16;
            color: #94a3b8;
            gap: 16px;
            font-family: system-ui, sans-serif;
          }
          .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(99, 102, 241, 0.2);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  const navItems = [
    {
      label: 'Overview',
      path: '/dashboard',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      label: 'Users',
      path: '/dashboard/users',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Roles & Permissions',
      path: '/dashboard/roles',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: 'Integrations',
      path: '/dashboard/integrations',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1" />
          <path d="M18 8h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="6" y1="12" x2="18" y2="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar glass-card">
        <div className="sidebar-brand">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          <span className="brand-text">Omni<span>Sync</span></span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link key={item.path} href={item.path} className={`nav-item ${isActive ? 'active' : ''}`}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="btn-logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-layout">
        <header className="main-header glass-card">
          <div className="header-title">
            <h1>
              {pathname === '/dashboard' && 'Platform Overview'}
              {pathname === '/dashboard/users' && 'User Management'}
              {pathname === '/dashboard/roles' && 'Roles & Access Permissions'}
              {pathname === '/dashboard/integrations' && 'Marketplace Integrations'}
            </h1>
            <p className="header-subtitle">Welcome back, {user?.name || 'Administrator'}</p>
          </div>

          <div className="user-profile-widget">
            <div className="user-avatar">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="badge badge-info">{user?.role?.name || 'Admin'}</span>
            </div>
          </div>
        </header>

        <main className="content-container">
          {children}
        </main>
      </div>

      <style jsx global>{`
        .dashboard-container {
          display: flex;
          min-height: 100vh;
          background-color: #060913;
          background-image: 
            radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.05) 0%, transparent 40%),
            radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 40%);
          padding: 20px;
          gap: 20px;
          overflow: hidden;
        }

        .sidebar {
          width: 280px;
          display: flex;
          flex-direction: column;
          border-radius: 20px;
          padding: 30px 20px;
          background: rgba(10, 15, 30, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.05);
          flex-shrink: 0;
          height: calc(100vh - 40px);
          position: sticky;
          top: 20px;
        }

        .sidebar-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 40px;
          padding-left: 8px;
        }

        .sidebar-brand svg {
          width: 32px;
          height: 32px;
          color: #6366f1;
        }

        .brand-text {
          font-size: 1.4rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .brand-text span {
          color: #06b6d4;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-grow: 1;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          border-radius: 12px;
          color: #94a3b8;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .nav-item:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.03);
        }

        .nav-item.active {
          color: #fff;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.2);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
        }

        .nav-icon svg {
          width: 20px;
          height: 20px;
          transition: transform 0.2s ease;
        }

        .nav-item:hover .nav-icon svg {
          transform: translateX(2px);
        }

        .sidebar-footer {
          margin-top: auto;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 20px;
        }

        .btn-logout {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border-radius: 12px;
          background: transparent;
          border: none;
          color: #ef4444;
          font-weight: 500;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .btn-logout:hover {
          background: rgba(239, 68, 68, 0.08);
        }

        .btn-logout svg {
          width: 20px;
          height: 20px;
        }

        .main-layout {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 20px;
          height: calc(100vh - 40px);
          overflow-y: auto;
          padding-right: 4px;
        }

        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 30px;
          border-radius: 20px;
          background: rgba(10, 15, 30, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .header-title h1 {
          font-size: 1.45rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.01em;
        }

        .header-subtitle {
          font-size: 0.88rem;
          color: #64748b;
          margin-top: 2px;
        }

        .user-profile-widget {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 6px 16px 6px 8px;
          border-radius: 40px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1 0%, #06b6d4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: 600;
          font-size: 0.95rem;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.3);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .user-name {
          font-size: 0.88rem;
          font-weight: 600;
          color: #f1f5f9;
        }

        .content-container {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 0;
        }

        /* Responsive */
        @media (max-width: 992px) {
          .dashboard-container {
            flex-direction: column;
          }
          .sidebar {
            width: 100%;
            height: auto;
            position: relative;
            top: 0;
          }
          .main-layout {
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}

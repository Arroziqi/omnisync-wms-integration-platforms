"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  slug: string;
  title: string;
  category: string;
  description: string;
}

const docsCatalog: SidebarItem[] = [
  {
    slug: 'admin/getting-started',
    title: 'Admin Onboarding Guide',
    category: 'ADMINISTRATION',
    description: 'Introduction, default credentials, password policies, and user profiles.',
  },
  {
    slug: 'admin/marketplaces',
    title: 'Marketplace Setup & OAuth',
    category: 'ADMINISTRATION',
    description: 'TikTok Shop, Shopee, and Lazada secure API connectors setup guides.',
  },
  {
    slug: 'admin/products',
    title: 'Catalog Sync SOP',
    category: 'ADMINISTRATION',
    description: 'SKU variant mappings, active sync procedures, and troubleshooting guidelines.',
  },
  {
    slug: 'admin/inventory',
    title: 'Warehouse Stock Reconciliation',
    category: 'ADMINISTRATION',
    description: 'Warehouse tracking, manual adjustments, and conflict-resolution rules.',
  },
  {
    slug: 'admin/orders',
    title: 'Order Sync & recovery',
    category: 'ADMINISTRATION',
    description: 'Automated ingestion pipelines, status mappings, and resync workflows.',
  },
  {
    slug: 'admin/monitoring',
    title: 'Platform Visibility Matrix',
    category: 'ADMINISTRATION',
    description: 'Real-time dashboard metrics, query logs, audit trails, and queue tracking.',
  },
  {
    slug: 'operations',
    title: 'Incident SOP & Escalations',
    category: 'OPERATIONS',
    description: 'Severity-1 platform outages, queue alerts, and engineer escalation paths.',
  },
  {
    slug: 'developers/architecture',
    title: 'High & Low Level Architecture',
    category: 'DEVELOPMENT',
    description: 'Microservice boundaries, BullMQ async queues, and database streams.',
  },
  {
    slug: 'developers/setup',
    title: 'Local Setup & Prerequisites',
    category: 'DEVELOPMENT',
    description: 'PostgreSQL, Redis setups, env variables configurations, and test runners.',
  },
  {
    slug: 'developers/api',
    title: 'REST API References',
    category: 'DEVELOPMENT',
    description: '14 functional REST API modules, payloads, and mock definitions.',
  },
  {
    slug: 'developers/database',
    title: 'ERD Schema & Migrations',
    category: 'DEVELOPMENT',
    description: 'TypeORM PostgreSQL entities, relationship indexes, and structural maps.',
  },
  {
    slug: 'developers/queues',
    title: 'Queue Workers Lifecycles',
    category: 'DEVELOPMENT',
    description: 'Asynchronous workers, exponential retries, and DLQ tracking.',
  },
  {
    slug: 'devops',
    title: 'Production Deployments',
    category: 'DEVOPS & DEPLOYMENT',
    description: 'Docker Compose production stacks, VPS setups, and Let\'s Encrypt SSL Nginx.',
  },
  {
    slug: 'devops/disaster-recovery',
    title: 'Disaster Recovery SOPs',
    category: 'DEVOPS & DEPLOYMENT',
    description: 'Cron database backup scripts, restore validations, and S3 dumps.',
  },
  {
    slug: 'qa',
    title: 'Testing Strategy',
    category: 'QA TESTING',
    description: 'Unit testing, integration testing, and mock connector validations.',
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtering catalog based on search
  const filteredCatalog = docsCatalog.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="docs-page-container">
      {/* Background Glows */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>

      {/* Top Header Navbar consistent with landing pages */}
      <header className="navbar scrolled">
        <div className="navbar-container">
          <a href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="logo-text">Omni<span>Sync</span></span>
          </a>

          <nav className="nav-links">
            <a href="/#features">Features</a>
            <a href="/#marketplaces">Marketplaces</a>
            <a href="/#architecture">Architecture</a>
            <a href="/#benefits">Benefits</a>
            <a href="/business-overview">Business ROI</a>
          </nav>

          <div className="nav-actions">
            <a href="http://localhost:3000/login" className="btn-primary nav-btn">
              <span>Access Portal</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main Layout Workspace Grid */}
      <div className="docs-workspace">
        <aside className="docs-sidebar glass-card">
          {/* Version badge */}
          <div className="sidebar-header">
            <div className="badge badge-info version-badge">
              <span className="dot dot-green blink"></span>
              <span>v1.2.0-stable</span>
            </div>
          </div>

          {/* Search box input */}
          <div className="search-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              placeholder="Search documentation..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {/* Docs Navigation Links */}
          <nav className="sidebar-nav">
            <div className="nav-group">
              <span className="group-label">OVERVIEW</span>
              <a 
                href="/docs" 
                className={`sidebar-link ${pathname === '/docs' ? 'active' : ''}`}
              >
                Welcome & Hub Home
              </a>
            </div>

            {/* Categorized list items */}
            {filteredCatalog.map((item) => (
              <div className="nav-group" key={item.slug}>
                <span className="group-label">{item.category}</span>
                <a 
                  href={`/docs/${item.slug}`} 
                  className={`sidebar-link ${pathname === `/docs/${item.slug}` ? 'active' : ''}`}
                >
                  {item.title}
                </a>
              </div>
            ))}

            {filteredCatalog.length === 0 && (
              <div className="no-results">
                No articles matching "{searchQuery}"
              </div>
            )}
          </nav>
        </aside>

        {/* Main Doc Reading Content Area */}
        <main className="docs-content">
          <div className="content-inner glass-card">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 OmniSync Platform. All rights reserved. Enterprise Warehousing Integrations.</p>
      </footer>

      {/* Styled JSX */}
      <style jsx>{`
        .docs-page-container {
          min-height: 100vh;
          background-color: #05070f;
          color: #f8fafc;
          position: relative;
          display: flex;
          flex-direction: column;
        }

        .ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(150px);
          opacity: 0.08;
          z-index: 1;
          pointer-events: none;
        }

        .glow-1 {
          width: 500px;
          height: 500px;
          background: #6366f1;
          top: -200px;
          left: -150px;
        }

        .glow-2 {
          width: 600px;
          height: 600px;
          background: #06b6d4;
          bottom: -150px;
          right: -100px;
        }

        /* Navbar */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 100;
          padding: 14px 0;
          transition: all 0.3s ease;
          background: rgba(9, 13, 22, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .navbar-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo svg {
          width: 28px;
          height: 28px;
          color: #6366f1;
          filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.4));
        }

        .logo-text {
          font-size: 1.4rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .logo-text span {
          color: #06b6d4;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .nav-links a {
          color: #94a3b8;
          text-decoration: none;
          font-weight: 500;
          font-size: 0.95rem;
          transition: color 0.2s ease;
        }

        .nav-links a:hover {
          color: #f8fafc;
        }

        .nav-btn {
          padding: 8px 18px;
          font-size: 0.85rem;
        }

        .btn-icon {
          width: 16px;
          height: 16px;
          transition: transform 0.2s ease;
        }

        .btn-primary:hover .btn-icon {
          transform: translateY(2px);
        }

        /* Documentation Layout Workspace */
        .docs-workspace {
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          padding: 100px 24px 40px;
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 24px;
          flex-grow: 1;
          position: relative;
          z-index: 10;
        }

        /* Sidebar Styles */
        .docs-sidebar {
          background: rgba(16, 22, 38, 0.5);
          max-height: calc(100vh - 140px);
          overflow-y: auto;
          position: sticky;
          top: 90px;
          padding: 24px;
        }

        /* Custom scrollbar for sidebar */
        .docs-sidebar::-webkit-scrollbar {
          width: 5px;
        }

        .docs-sidebar::-webkit-scrollbar-track {
          background: transparent;
        }

        .docs-sidebar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.2);
          border-radius: 4px;
        }

        .docs-sidebar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.4);
        }

        .sidebar-header {
          margin-bottom: 20px;
        }

        .version-badge {
          background: rgba(16, 185, 129, 0.08) !important;
          color: #10b981 !important;
          border: 1px solid rgba(16, 185, 129, 0.2) !important;
        }

        .dot-green {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          margin-right: 6px;
          display: inline-block;
          box-shadow: 0 0 6px #10b981;
        }

        .blink {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }

        /* Search input */
        .search-box {
          position: relative;
          margin-bottom: 24px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          color: #64748b;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          background: rgba(9, 13, 22, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          padding: 10px 12px 10px 38px;
          color: #f8fafc;
          font-family: inherit;
          font-size: 0.88rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.15);
        }

        /* Navigation List */
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .group-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sidebar-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          padding: 6px 10px;
          border-radius: 6px;
          transition: all 0.2s ease;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-link:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.02);
        }

        .sidebar-link.active {
          color: #6366f1;
          background: rgba(99, 102, 241, 0.08);
          font-weight: 600;
        }

        .no-results {
          font-size: 0.82rem;
          color: #64748b;
          text-align: center;
          padding: 12px 0;
        }

        /* Content Area */
        .docs-content {
          min-width: 0; /* Prevents flex items from breaking grid parent constraints */
        }

        .content-inner {
          background: rgba(16, 22, 38, 0.4);
          padding: 40px;
          min-height: 500px;
        }

        /* Footer */
        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding: 30px 24px;
          text-align: center;
          font-size: 0.82rem;
          color: #64748b;
          margin-top: auto;
          position: relative;
          z-index: 10;
        }

        /* Responsive */
        @media (max-width: 992px) {
          .docs-workspace {
            grid-template-columns: 1fr;
            padding-top: 90px;
          }

          .docs-sidebar {
            position: relative;
            top: 0;
            width: 100%;
            margin-bottom: 24px;
          }
        }
      `}</style>
    </div>
  );
}

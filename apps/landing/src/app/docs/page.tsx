"use client";

interface GuideCard {
  slug: string;
  title: string;
  category: string;
  icon: string;
  description: string;
}

const guideCards: GuideCard[] = [
  {
    slug: 'admin/getting-started',
    title: 'Admin Onboarding Guide',
    category: 'GETTING STARTED',
    icon: '🚀',
    description: 'Establish secure connections, refresh tokens, adjust store products, manage inventory and adjust warehouse levels.',
  },
  {
    slug: 'developers/architecture',
    title: 'High & Low Level Architecture',
    category: 'SYSTEM DESIGN',
    icon: '📐',
    description: 'Deep dive into decoupled BullMQ async workers, NestJS service models, Outbound Rate Throttling, and signature verification filters.',
  },
  {
    slug: 'developers/api',
    title: 'API References & ERD Schema',
    category: 'INTEGRATIONS',
    icon: '📡',
    description: 'Review 14 operational API endpoints, detailed request/response payloads, security authorization headers, and TypeORM database schemas.',
  },
  {
    slug: 'devops',
    title: 'Production Ops & Deployment',
    category: 'PRODUCTION',
    icon: '📦',
    description: 'Hardening Ubuntu hosts, setting up Docker Compose production stacks, Let\'s Encrypt SSL Nginx routing, and automated database backups.',
  },
  {
    slug: 'operations',
    title: 'Operational Handbook',
    category: 'ADMINISTRATION',
    icon: '💼',
    description: 'Manage daily operations, handle incident logs, trigger manual recovery actions, and execute escalation SOP pathways.',
  },
];

export default function DocsPage() {
  return (
    <div className="docs-home-container">
      {/* Intro Header Section */}
      <section className="docs-intro-section">
        <h1 className="docs-home-title">Documentation Hub</h1>
        <p className="docs-home-subtitle">
          Welcome to the central information portal for the **OmniSync WMS Multi-Channel Integration Platform**.
          Find deep dives, API references, configuration guides, and onboarding checklists here.
        </p>
      </section>

      {/* Grid of guides */}
      <div className="docs-catalog-grid">
        {guideCards.map((guide) => (
          <a href={`/docs/${guide.slug}`} key={guide.slug} className="catalog-card-link">
            <div className="catalog-card glass-card">
              <span className="card-icon">{guide.icon}</span>
              <span className="card-badge">{guide.category}</span>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
              <div className="card-footer-link">
                <span>Read Manual</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="link-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Structural Pipeline Diagram Block */}
      <section className="architecture-block-section">
        <div className="block-header">
          <h3>Ecosystem Architecture at a Glance</h3>
          <p>Decoupled asynchronous event brokers processing multi-channel stock changes and order placements.</p>
        </div>
        <pre className="ascii-architecture glass-card">
{`                  ┌──────────────────────┐
                  │    Next.js Admin     │
                  │      Dashboard       │
                  └──────────┬───────────┘
                             │ HTTPS
                             ▼
                  ┌──────────────────────┐
                  │     API Gateway      │
                  │   (NestJS Gateway)   │
                  └──────────┬───────────┘
                             │
     ┌───────────────────────┼───────────────────────┐
     ▼                       ▼                       ▼
 ┌──────────────┐   ┌──────────────┐   ┌───────────────┐
 │ Auth Service │   │ Config/Admin │   │ Marketplace   │
 │              │   │   Service    │   │   Service     │
 └──────┬───────┘   └──────┬───────┘   └──────┬────────┘
        │                  │                  │
        ▼                  ▼                  ▼
 ┌─────────────────────────────────────────────────────┐
 │                 PostgreSQL Database                 │
 └─────────────────────────────────────────────────────┘
                            ▲
                            │ Sync / Logs
 ┌──────────────────────────┴─────────┐
 │          Webhook Service           │◄─────── Incoming Events
 └──────────────────────────┬─────────┘         (TikTok/Shopee/Lazada)
                            │
                            ▼
 ┌─────────────────────────────────────────────────────┐
 │              Redis + BullMQ Queue Hub               │
 └──────────────────────────┬──────────────────────────┘
                            │ Asynchronous Dispatch
                            ▼
 ┌─────────────────────────────────────────────────────┐
 │                   Worker Clusters                   │
 │   ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │
 │   │ Order Worker │  │Product Worker│  │Inv Worker│  │
 │   └──────┬───────┘  └──────┬───────┘  └────┬─────┘  │
 └──────────┼─────────────────┼───────────────┼────────┘
            └─────────────────┴───────────────┘
                              │
                              ▼
                  ┌──────────────────────┐
                  │   Marketplace APIs   │
                  │ TikTok / Shopee / Laz│
                  └──────────────────────┘`}
        </pre>
      </section>

      {/* Quick Start Quick Links */}
      <section className="quickstart-checklist">
        <h3>Administrative Quick Start</h3>
        <p className="checklist-sub text-muted">A quick guide for operations admins getting familiar with the platform login structure:</p>
        <div className="quickstart-box glass-card">
          <ul className="qs-items">
            <li>
              <div className="qs-dot note"></div>
              <div>
                <strong>Default Administrator:</strong> Use email `admin@omnisync.io` and password `Secret123!` to boot into the dashboard.
              </div>
            </li>
            <li>
              <div className="qs-dot success"></div>
              <div>
                <strong>Store OAuth setup:</strong> Active Shopee, Lazada, and TikTok integrations require populating client IDs and exchanging callback auth codes.
              </div>
            </li>
            <li>
              <div className="qs-dot cyan"></div>
              <div>
                <strong>Failed jobs queue:</strong> Critical failures collect securely inside NestJS PostgreSQL DLQ worker tables for safe manual re-push operations.
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Styled JSX */}
      <style jsx>{`
        .docs-home-container {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .docs-intro-section {
          margin-bottom: 12px;
        }

        .docs-home-title {
          font-size: 2.2rem;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
        }

        .docs-home-subtitle {
          font-size: 1.05rem;
          line-height: 1.6;
          color: #94a3b8;
          max-width: 780px;
        }

        .docs-catalog-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .catalog-card-link {
          text-decoration: none;
          color: inherit;
        }

        .catalog-card {
          padding: 28px;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          background: rgba(16, 22, 38, 0.4);
          transition: all 0.3s ease;
        }

        .catalog-card:hover {
          border-color: rgba(99, 102, 241, 0.25);
          box-shadow: 0 10px 30px rgba(99, 102, 241, 0.08);
          transform: translateY(-2px);
        }

        .card-icon {
          font-size: 2rem;
          margin-bottom: 16px;
        }

        .card-badge {
          font-size: 0.65rem;
          font-weight: 700;
          color: #06b6d4;
          background: rgba(6, 182, 212, 0.08);
          border: 1px solid rgba(6, 182, 212, 0.15);
          padding: 2px 8px;
          border-radius: 4px;
          margin-bottom: 14px;
          letter-spacing: 0.04em;
        }

        .catalog-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 10px;
        }

        .catalog-card p {
          font-size: 0.88rem;
          line-height: 1.55;
          color: #94a3b8;
          margin-bottom: 24px;
          flex-grow: 1;
        }

        .card-footer-link {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #6366f1;
        }

        .link-arrow {
          width: 14px;
          height: 14px;
          transition: transform 0.2s ease;
        }

        .catalog-card:hover .link-arrow {
          transform: translateX(4px);
        }

        /* Architecture Block */
        .architecture-block-section {
          margin-top: 12px;
        }

        .block-header {
          margin-bottom: 20px;
        }

        .block-header h3 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 4px;
          color: #f8fafc;
        }

        .block-header p {
          font-size: 0.88rem;
          color: #64748b;
        }

        .ascii-architecture {
          background: rgba(9, 13, 22, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 24px;
          font-family: monospace;
          font-size: 0.72rem;
          line-height: 1.45;
          color: #94a3b8;
          overflow-x: auto;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
        }

        /* Quick Start */
        .quickstart-checklist h3 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 4px;
          color: #f8fafc;
        }

        .checklist-sub {
          font-size: 0.88rem;
          margin-bottom: 16px;
        }

        .quickstart-box {
          background: rgba(16, 22, 38, 0.4);
          padding: 28px;
        }

        .qs-items {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .qs-items li {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          font-size: 0.92rem;
          line-height: 1.5;
          color: #cbd5e1;
        }

        .qs-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 6px;
        }

        .qs-dot.note { background: #6366f1; box-shadow: 0 0 6px #6366f1; }
        .qs-dot.success { background: #10b981; box-shadow: 0 0 6px #10b981; }
        .qs-dot.cyan { background: #06b6d4; box-shadow: 0 0 6px #06b6d4; }

        .text-muted {
          color: #64748b;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .docs-catalog-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

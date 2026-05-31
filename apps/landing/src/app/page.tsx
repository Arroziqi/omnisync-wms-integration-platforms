"use client";

import { useEffect, useState } from 'react';

export default function IndexPage() {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-page-container">
      {/* Background Glows */}
      <div className="ambient-glow glow-1"></div>
      <div className="ambient-glow glow-2"></div>
      <div className="ambient-glow glow-3"></div>

      {/* Navigation Header */}
      <header className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <a href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="logo-text">Omni<span>Sync</span></span>
          </a>

          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#marketplaces">Marketplaces</a>
            <a href="#architecture">Architecture</a>
            <a href="#benefits">Benefits</a>
            <a href="/business-overview">Business ROI</a>
            <a href="/docs">Docs Hub</a>
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

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge badge badge-info">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ marginRight: '4px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            <span>v1.2 Enterprise Ready</span>
          </div>

          <h1 className="hero-title">
            Enterprise-Grade <br />
            <span className="gradient-text">WMS & Marketplace Integration</span>
          </h1>

          <p className="hero-subtitle">
            OmniSync bridges the gap between your Warehouse Management System and major e-commerce platforms. 
            Automate stock updates, synchronize orders, and monitor operations with zero drop rates.
          </p>

          <div className="hero-ctas">
            <a href="http://localhost:3000/login" className="btn-primary hero-btn">
              <span>Launch Dashboard</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a href="#features" className="btn-secondary hero-btn">
              Explore Features
            </a>
          </div>
        </div>

        {/* Visual Mockup Dashboard representation */}
        <div className="hero-visual">
          <div className="mockup-container glass-card">
            <div className="mockup-header">
              <div className="dots">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <div className="mockup-title">OmniSync Central Controller</div>
            </div>
            <div className="mockup-body">
              <div className="dashboard-grid">
                <div className="dashboard-stat glass-card">
                  <div className="stat-label">SYSTEM HEALTH</div>
                  <div className="stat-val text-success">99.98%</div>
                  <div className="stat-progress success-bg"></div>
                </div>
                <div className="dashboard-stat glass-card">
                  <div className="stat-label">TOTAL SYNCED JOB</div>
                  <div className="stat-val text-primary">148.9K</div>
                  <div className="stat-progress primary-bg"></div>
                </div>
                <div className="dashboard-stat glass-card">
                  <div className="stat-label">QUEUED EVENT</div>
                  <div className="stat-val text-cyan">0 active</div>
                  <div className="stat-progress cyan-bg"></div>
                </div>
              </div>

              {/* Console log sync simulation */}
              <div className="console-panel">
                <div className="console-line"><span className="c-tag info">INFO</span> [Order Sync Queue] Processing Job #87291: TikTok Shop Order #TS-992...</div>
                <div className="console-line"><span className="c-tag success">SUCCESS</span> [Order Sync Queue] Job #87291 completed. Status updated in WMS database.</div>
                <div className="console-line"><span className="c-tag info">INFO</span> [Inventory Sync] Event detected: SKU "OMNI-SHOE-01" stock changed: 42 {"\u2192"} 39.</div>
                <div className="console-line"><span className="c-tag info">INFO</span> [Inventory Sync] Dispatching updates to [Shopee, Lazada, TikTok Shop]...</div>
                <div className="console-line"><span className="c-tag success">SUCCESS</span> [Inventory Sync] Shopee, Lazada, and TikTok Shop successfully synced.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution Statement */}
      <section className="problem-solution-section" id="solution">
        <div className="section-header">
          <h2 className="section-title">Bridging The Operational Gap</h2>
          <p className="section-subtitle">Why major warehouses trust OmniSync for multi-channel commerce execution.</p>
        </div>

        <div className="problem-solution-grid">
          <div className="prob-sol-card glass-card prob-card">
            <div className="card-tag badge badge-error">The Chaos</div>
            <h3>Disjointed Operations</h3>
            <ul className="list-items">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span><strong>Overselling & Stockouts:</strong> Delayed updates lead to negative reviews and penalizations.</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span><strong>API Quota Limits:</strong> Direct loops exhaust API quotas causing webhook synchronization blackouts.</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span><strong>Silent Failures:</strong> Lost webhook payloads from marketplaces without retry queues.</span>
              </li>
            </ul>
          </div>

          <div className="prob-sol-card glass-card sol-card">
            <div className="card-tag badge badge-success">The Solution</div>
            <h3>Real-Time Event Automation</h3>
            <ul className="list-items">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span><strong>Instant Sync Updates:</strong> Less than 2s latency for inventory adjustment dispatches.</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span><strong>Persistent Queuing:</strong> Powered by BullMQ & Redis for durable order event storage.</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span><strong>DLQ Auto-Recovery:</strong> Failed updates isolate inside DLQ with options for manual retry.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="features-section" id="features">
        <div className="section-header">
          <h2 className="section-title">Core System Architecture Features</h2>
          <p className="section-subtitle">Engineered for absolute reliability, security, and extreme high throughput.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card glass-card">
            <div className="feature-icon bg-indigo">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <h4>Live Inventory Sync</h4>
            <p>Real-time webhook and scheduler tracking dispatches local WMS stock updates directly to multi-channel stores instantly.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon bg-cyan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 4v16M2 12h20"/></svg>
            </div>
            <h4>Automatic Order Pull</h4>
            <p>Captures orders immediately upon purchase across all endpoints, standardizing customer, item, and variant details to WMS.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon bg-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h4>Rate Limiting & Quotas</h4>
            <p>Enforces API quota management to protect connections, throttling calls cleanly based on marketplace limits.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon bg-red">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            </div>
            <h4>DLQ & Failed Recovery</h4>
            <p>Isolates problematic updates. The operations staff can retry payloads manually via dashboard once corrected.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon bg-orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <h4>Live Fail Notifications</h4>
            <p>Instant visual and auditory notifications on the controller dashboard for failed webhooks or connection drops.</p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon bg-green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h4>Audit Logging & Security</h4>
            <p>Tracks administrator actions and event adjustments for full transparency, protected under NestJS token encryption.</p>
          </div>
        </div>
      </section>

      {/* Supported Marketplaces */}
      <section className="marketplaces-section" id="marketplaces">
        <div className="section-header">
          <h2 className="section-title">Supported Commerce Channels</h2>
          <p className="section-subtitle">Plug-and-play connections with industry leaders. Zero additional code needed.</p>
        </div>

        <div className="marketplaces-grid">
          <div className="marketplace-card glass-card shopee">
            <div className="card-glow"></div>
            <div className="mp-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19c-.31.31-.73.49-1.19.49s-.88-.18-1.19-.49l-2.62-2.62c-.31-.31-.49-.73-.49-1.19s.18-.88.49-1.19l2.62-2.62c.31-.31.73-.49 1.19-.49s.88.18 1.19.49l2.62 2.62c.31.31.49.73.49 1.19s-.18.88-.49 1.19l-2.62 2.62z"/>
              </svg>
            </div>
            <h3>Shopee</h3>
            <p className="mp-status"><span className="status-indicator live"></span> LIVE & SYNCED</p>
            <p className="mp-desc">Supports auto order retrieval, stock mapping, and refresh tokens.</p>
          </div>

          <div className="marketplace-card glass-card lazada">
            <div className="card-glow"></div>
            <div className="mp-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <h3>Lazada</h3>
            <p className="mp-status"><span className="status-indicator live"></span> LIVE & SYNCED</p>
            <p className="mp-desc">Full inventory callback webhooks with optimized rate throttling.</p>
          </div>

          <div className="marketplace-card glass-card tiktok">
            <div className="card-glow"></div>
            <div className="mp-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.525.025v16.142a4.34 4.34 0 0 1-4.331 4.337A4.343 4.343 0 0 1 3.86 16.17a4.343 4.343 0 0 1 4.334-4.337v4.137a.2.2 0 0 0-.2.203.203.203 0 0 0 .204.203.2.2 0 0 0 .2-.203.203.203 0 0 0-.204-.203c-.22 0-3.334-.14-3.334 3.337a3.334 3.334 0 0 0 3.334 3.337c1.84 0 3.334-1.5 3.334-3.337V6.012c1.47 1.05 3.3 1.68 5.28 1.68V3.555A7.472 7.472 0 0 1 12.525.025z"/>
              </svg>
            </div>
            <h3>TikTok Shop</h3>
            <p className="mp-status"><span className="status-indicator live"></span> LIVE & SYNCED</p>
            <p className="mp-desc">Real-time purchase notification streams integrated natively.</p>
          </div>
        </div>
      </section>

      {/* Architecture Overview */}
      <section className="architecture-section" id="architecture">
        <div className="section-header">
          <h2 className="section-title">Under The Hood Architecture</h2>
          <p className="section-subtitle">Designed as an asynchronous, event-driven ecosystem optimized for data integrity.</p>
        </div>

        <div className="architecture-diagram glass-card">
          <div className="arch-node-grid">
            <div className="arch-block glass-card">
              <div className="arch-title">1. Marketplaces</div>
              <div className="arch-details">Shopee / Lazada / TikTok Shop</div>
              <div className="arch-flow-arrow">▼ Webhooks & API</div>
            </div>

            <div className="arch-block glass-card border-cyan">
              <div className="arch-title">2. Webhook Queue</div>
              <div className="arch-details">BullMQ + Redis Event Broker</div>
              <div className="arch-flow-arrow">▼ Asynchronous Stream</div>
            </div>

            <div className="arch-block glass-card border-indigo">
              <div className="arch-title">3. Core Server</div>
              <div className="arch-details">NestJS Controller + TypeORM + DLQ</div>
              <div className="arch-flow-arrow">▼ State Dispatcher</div>
            </div>

            <div className="arch-block glass-card border-green">
              <div className="arch-title">4. Client Console</div>
              <div className="arch-details">Next.js Operations Dashboard</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Metrics Section */}
      <section className="benefits-section" id="benefits">
        <div className="section-header">
          <h2 className="section-title">Measurable Platform Benefits</h2>
          <p className="section-subtitle">Real numbers driving commercial success for modern warehousing hubs.</p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-metric-card glass-card">
            <div className="metric-val text-primary">99.99%</div>
            <h5>Synchronization Accuracy</h5>
            <p>Virtually zero inventory mismatches across Shopee, Lazada, and TikTok Shop channels.</p>
          </div>

          <div className="benefit-metric-card glass-card">
            <div className="metric-val text-success">&lt; 2.0s</div>
            <h5>Sync Processing Latency</h5>
            <p>Immediate event dispatches from local change detection straight to online marketplace fronts.</p>
          </div>

          <div className="benefit-metric-card glass-card">
            <div className="metric-val text-cyan">100%</div>
            <h5>Failure Protection</h5>
            <p>Failed callbacks are persistent in PostgreSQL DLQ tables to safeguard against message losses.</p>
          </div>

          <div className="benefit-metric-card glass-card">
            <div className="metric-val text-orange">10x</div>
            <h5>Operations Speedup</h5>
            <p>Replaces manual listing checks with a single autonomous central dashboard manager.</p>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="cta-footer-section">
        <div className="cta-footer-card glass-card">
          <h2>Ready to Synchronize Your Operations?</h2>
          <p>Get started today with our secure, enterprise-ready multi-channel sync manager portal.</p>
          <div className="cta-actions">
            <a href="http://localhost:3000/login" className="btn-primary cta-btn">
              <span>Access Control Portal</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 OmniSync Platform. All rights reserved. Enterprise Warehousing Integrations.</p>
      </footer>

      {/* Styling specific to Landing Page */}
      <style jsx>{`
        .landing-page-container {
          min-height: 100vh;
          background-color: #05070f;
          color: #f8fafc;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient glows styling */
        .ambient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(150px);
          opacity: 0.12;
          z-index: 1;
          pointer-events: none;
        }

        .glow-1 {
          width: 600px;
          height: 600px;
          background: #6366f1;
          top: -200px;
          left: -150px;
        }

        .glow-2 {
          width: 500px;
          height: 500px;
          background: #06b6d4;
          top: 30%;
          right: -100px;
        }

        .glow-3 {
          width: 700px;
          height: 700px;
          background: #4f46e5;
          bottom: -150px;
          left: 10%;
        }

        /* Navbar */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          z-index: 100;
          padding: 20px 0;
          transition: all 0.3s ease;
        }

        .navbar.scrolled {
          background: rgba(9, 13, 22, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 14px 0;
        }

        .navbar-container {
          max-width: 1200px;
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
          transform: translateX(4px);
        }

        /* Hero section */
        .hero-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 160px 24px 80px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .hero-content {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .hero-badge {
          margin-bottom: 24px;
        }

        .hero-title {
          font-size: 3.2rem;
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: 20px;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #94a3b8;
          margin-bottom: 36px;
          max-width: 580px;
        }

        .hero-ctas {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .hero-btn {
          padding: 14px 28px;
          font-size: 1rem;
        }

        .hero-visual {
          width: 100%;
        }

        .mockup-container {
          background: rgba(16, 22, 38, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
          padding: 0;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .mockup-header {
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding: 12px 18px;
          display: flex;
          align-items: center;
          position: relative;
        }

        .dots {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .mockup-title {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .mockup-body {
          padding: 20px;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        .dashboard-stat {
          padding: 12px;
          text-align: center;
          background: rgba(255, 255, 255, 0.01);
          border-radius: 10px;
          position: relative;
          overflow: hidden;
        }

        .stat-label {
          font-size: 0.65rem;
          color: #64748b;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .stat-val {
          font-size: 1.15rem;
          font-weight: 700;
        }

        .text-success { color: #10b981; }
        .text-primary { color: #6366f1; }
        .text-cyan { color: #06b6d4; }

        .stat-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: 80%;
        }
        .success-bg { background: #10b981; width: 100%; }
        .primary-bg { background: #6366f1; width: 85%; }
        .cyan-bg { background: #06b6d4; width: 5%; }

        .console-panel {
          background: rgba(5, 7, 15, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 10px;
          padding: 14px;
          font-family: monospace;
          font-size: 0.72rem;
          color: #94a3b8;
          height: 140px;
          overflow-y: hidden;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .console-line {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .c-tag {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 1px 4px;
          border-radius: 3px;
          margin-right: 6px;
        }
        .c-tag.info { background: rgba(99, 102, 241, 0.15); color: #6366f1; }
        .c-tag.success { background: rgba(16, 185, 129, 0.15); color: #10b981; }

        /* Problem & Solution section */
        .problem-solution-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .section-header {
          text-align: center;
          margin-bottom: 56px;
        }

        .section-title {
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 12px;
        }

        .section-subtitle {
          color: #94a3b8;
          font-size: 1rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .problem-solution-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }

        .prob-sol-card {
          padding: 36px;
          border-radius: 20px;
          background: rgba(16, 22, 38, 0.4);
        }

        .card-tag {
          margin-bottom: 20px;
        }

        .prob-sol-card h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 24px;
        }

        .list-items {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .list-items li {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          line-height: 1.5;
          font-size: 0.95rem;
          color: #cbd5e1;
        }

        .list-items li svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .prob-card svg { color: #ef4444; }
        .sol-card svg { color: #10b981; }

        .list-items li strong {
          color: #f8fafc;
        }

        /* Features Section */
        .features-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .feature-card {
          padding: 32px;
          background: rgba(16, 22, 38, 0.4);
          border-radius: 16px;
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }

        .feature-icon svg {
          width: 24px;
          height: 24px;
        }

        .bg-indigo { background: rgba(99, 102, 241, 0.12); color: #6366f1; }
        .bg-cyan { background: rgba(6, 182, 212, 0.12); color: #06b6d4; }
        .bg-blue { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
        .bg-red { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
        .bg-orange { background: rgba(249, 115, 22, 0.12); color: #f97316; }
        .bg-green { background: rgba(16, 185, 129, 0.12); color: #10b981; }

        .feature-card h4 {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 12px;
          color: #f8fafc;
        }

        .feature-card p {
          font-size: 0.9rem;
          line-height: 1.5;
          color: #94a3b8;
        }

        /* Marketplaces section */
        .marketplaces-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .marketplaces-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .marketplace-card {
          padding: 40px 32px;
          text-align: center;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          background: rgba(16, 22, 38, 0.35);
        }

        .mp-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }

        .mp-icon svg {
          width: 32px;
          height: 32px;
        }

        .shopee .mp-icon svg { color: #f97316; }
        .lazada .mp-icon svg { color: #3b82f6; }
        .tiktok .mp-icon svg { color: #f8fafc; }

        .marketplace-card h3 {
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .mp-status {
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 2px 8px;
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.15);
          border-radius: 4px;
          color: #10b981;
          margin-bottom: 16px;
        }

        .status-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-indicator.live {
          background: #10b981;
          box-shadow: 0 0 6px #10b981;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.6; }
        }

        .mp-desc {
          font-size: 0.9rem;
          line-height: 1.5;
          color: #94a3b8;
        }

        .card-glow {
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 60px;
          filter: blur(25px);
          opacity: 0.08;
          border-radius: 50%;
        }
        .shopee .card-glow { background: #f97316; }
        .lazada .card-glow { background: #3b82f6; }
        .tiktok .card-glow { background: #f8fafc; }

        /* Architecture Section */
        .architecture-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .architecture-diagram {
          padding: 40px;
          background: rgba(16, 22, 38, 0.3);
          border-radius: 20px;
        }

        .arch-node-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .arch-block {
          padding: 24px 18px;
          text-align: center;
          background: rgba(9, 13, 22, 0.8);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 130px;
          position: relative;
        }

        .border-cyan { border-color: rgba(6, 182, 212, 0.3) !important; }
        .border-indigo { border-color: rgba(99, 102, 241, 0.3) !important; }
        .border-green { border-color: rgba(16, 185, 129, 0.3) !important; }

        .arch-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #f8fafc;
          margin-bottom: 8px;
        }

        .arch-details {
          font-size: 0.8rem;
          color: #94a3b8;
          line-height: 1.4;
        }

        .arch-flow-arrow {
          position: absolute;
          right: -24px;
          top: 50%;
          transform: translateY(-50%) rotate(-90deg);
          font-size: 0.8rem;
          color: #475569;
          font-weight: 700;
        }

        /* Benefits section */
        .benefits-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .benefits-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .benefit-metric-card {
          padding: 32px 24px;
          text-align: center;
          background: rgba(16, 22, 38, 0.4);
          border-radius: 16px;
        }

        .metric-val {
          font-size: 2.8rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin-bottom: 12px;
          line-height: 1;
        }

        .benefit-metric-card h5 {
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 10px;
          color: #f8fafc;
        }

        .benefit-metric-card p {
          font-size: 0.85rem;
          line-height: 1.5;
          color: #94a3b8;
        }

        /* CTA Footer */
        .cta-footer-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .cta-footer-card {
          padding: 60px 40px;
          text-align: center;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(16, 22, 38, 0.8) 0%, rgba(9, 13, 22, 0.9) 100%);
          border: 1px solid rgba(99, 102, 241, 0.15);
          box-shadow: 0 15px 40px rgba(99, 102, 241, 0.05);
        }

        .cta-footer-card h2 {
          font-size: 2.2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
        }

        .cta-footer-card p {
          font-size: 1.1rem;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto 32px;
        }

        .cta-btn {
          padding: 14px 36px;
          font-size: 1rem;
        }

        /* Footer */
        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding: 32px 24px;
          text-align: center;
          position: relative;
          z-index: 10;
        }

        .footer p {
          font-size: 0.8rem;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Media Queries for Responsiveness */
        @media (max-width: 1024px) {
          .hero-section {
            grid-template-columns: 1fr;
            padding-top: 120px;
            gap: 40px;
            text-align: center;
          }

          .hero-content {
            align-items: center;
          }

          .hero-subtitle {
            margin-left: auto;
            margin-right: auto;
          }

          .hero-ctas {
            justify-content: center;
          }

          .arch-node-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 36px;
          }

          .arch-flow-arrow {
            display: none;
          }

          .benefits-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .hero-title {
            font-size: 2.4rem;
          }

          .problem-solution-grid {
            grid-template-columns: 1fr;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .marketplaces-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .arch-node-grid {
            grid-template-columns: 1fr;
          }

          .benefits-grid {
            grid-template-columns: 1fr;
          }

          .cta-footer-card {
            padding: 40px 20px;
          }

          .cta-footer-card h2 {
            font-size: 1.6rem;
          }
        }
      `}</style>
    </div>
  );
}

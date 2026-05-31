"use client";

import { useEffect, useState } from 'react';

export default function BusinessOverviewPage() {
  const [_mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // ROI Calculator States
  const [monthlyOrders, setMonthlyOrders] = useState(15000);
  const [errorRate, setErrorRate] = useState(2.5); // percentage
  const [penaltyFee, setPenaltyFee] = useState(15); // average cost per penalty / cancelation
  const [laborHours, setLaborHours] = useState(45); // hours spent manually updating inventory/orders

  // Synchronization Pipeline Toggle State
  const [activePipeline, setActivePipeline] = useState<'stock' | 'order'>('stock');

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

  // ROI Calculations
  const penaltiesSaved = Math.round(monthlyOrders * (errorRate / 100) * penaltyFee);
  const laborSavedVal = Math.round(laborHours * 30); // Estimating $30/hour operations labor cost
  const totalSavings = penaltiesSaved + laborSavedVal;
  const subscriptionCost = 249; // $249 / month enterprise subscription
  const roiPercentage = Math.round(((totalSavings - subscriptionCost) / subscriptionCost) * 100);

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
            <a href="/#features">Features</a>
            <a href="/#marketplaces">Marketplaces</a>
            <a href="/#architecture">Architecture</a>
            <a href="/#benefits">Benefits</a>
            <a href="/business-overview" className="active">Business ROI</a>
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
          <div className="hero-badge badge badge-success">
            <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ marginRight: '4px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span>BUSINESS STRATEGY & ROI</span>
          </div>

          <h1 className="hero-title">
            Maximize Yield. <br />
            <span className="gradient-text">Eliminate Overselling.</span>
          </h1>

          <p className="hero-subtitle">
            OmniSync bridges the gap between digital sales frontends and WMS inventory realities. Protect your marketplace ratings, capture operational margins, and scale without friction.
          </p>

          <div className="hero-ctas">
            <a href="#roi-calculator" className="btn-primary hero-btn">
              <span>Calculate Your ROI</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                <path d="M19 14l-7 7-7-7M12 21V3" />
              </svg>
            </a>
            <a href="#use-cases" className="btn-secondary hero-btn">
              Explore Use Cases
            </a>
          </div>
        </div>

        {/* Stakeholder Metrics Summary */}
        <div className="hero-visual">
          <div className="metrics-box-container glass-card">
            <div className="metrics-box-header">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
              <span className="metrics-box-title">Financial Impact Summary</span>
            </div>
            <div className="metrics-box-body">
              <div className="impact-item">
                <div className="impact-icon-wrapper success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                </div>
                <div className="impact-text">
                  <h3>0% Cancellation Rates</h3>
                  <p>Real-time stock synchronization eliminates overselling and subsequent platform listing penalties.</p>
                </div>
              </div>

              <div className="impact-item">
                <div className="impact-icon-wrapper primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div className="impact-text">
                  <h3>90% Faster Recovery</h3>
                  <p>Isolated Dead Letter Queues (DLQ) allow operations staff to recover failed sync events inside seconds.</p>
                </div>
              </div>

              <div className="impact-item">
                <div className="impact-icon-wrapper cyan">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                  </svg>
                </div>
                <div className="impact-text">
                  <h3>Unified Channels</h3>
                  <p>Add new Shopee, Lazada, or TikTok Shop integrations on-the-fly without changing backend architecture.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section" id="use-cases">
        <div className="section-header">
          <h2 className="section-title">Designed for Enterprise Scale</h2>
          <p className="section-subtitle">Real-world operational challenges solved by OmniSync’s high-throughput architecture.</p>
        </div>

        <div className="use-cases-grid">
          <div className="use-case-card glass-card">
            <div className="use-case-tag badge badge-info">Flash Sales</div>
            <h3>Double-Digit Campaigns</h3>
            <p>During peak shopping events (11.11, 12.12), transaction volumes spike by 10x. OmniSync’s BullMQ architecture queues webhook events to absorb traffic spikes, throttling calls safely to avoid marketplace rate bans while maintaining under-2-second sync latency.</p>
            <div className="use-case-footer">
              <span className="val-pill">Throttling Protection</span>
              <span className="val-pill">Spike Absorption</span>
            </div>
          </div>

          <div className="use-case-card glass-card">
            <div className="use-case-tag badge badge-success">3PL & Logistics</div>
            <h3>Multi-Warehouse Routing</h3>
            <p>Coordinate physical inventories located across distributed hubs. Whenever stock moves, adjustments are instantly verified and balanced across online storefront listings, preventing disjointed catalog states and overselling disputes.</p>
            <div className="use-case-footer">
              <span className="val-pill">Distributed Inventory</span>
              <span className="val-pill">ERP Sync</span>
            </div>
          </div>

          <div className="use-case-card glass-card">
            <div className="use-case-tag badge badge-warning">Operations</div>
            <h3>Rapid Business Scaling</h3>
            <p>Seamlessly expand storefront footprints. Adding new Lazada outlets, secondary TikTok Shops, or localized Shopee hubs requires zero custom code. Enable secure OAuth tokens inside the admin dashboard to extend coverage instantly.</p>
            <div className="use-case-footer">
              <span className="val-pill">Zero Custom Code</span>
              <span className="val-pill">Encrypted OAuth</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="roi-section" id="roi-calculator">
        <div className="section-header">
          <h2 className="section-title">Operational ROI Calculator</h2>
          <p className="section-subtitle">Estimate your monthly savings by switching to OmniSync’s automated event-driven sync pipeline.</p>
        </div>

        <div className="roi-calculator-grid glass-card">
          <div className="calculator-controls">
            <h3>Configure Your Metrics</h3>
            <p className="controls-intro">Slide the values below to match your warehouse’s current multi-channel retail operations.</p>

            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Average Monthly Orders</span>
                <span className="slider-value">{monthlyOrders.toLocaleString()}</span>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="100000" 
                step="1000"
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(Number(e.target.value))}
                className="custom-slider"
              />
              <div className="slider-bounds">
                <span>1K</span>
                <span>100K</span>
              </div>
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Current Overselling/Dispute Rate</span>
                <span className="slider-value">{errorRate}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="10.0" 
                step="0.1"
                value={errorRate}
                onChange={(e) => setErrorRate(Number(e.target.value))}
                className="custom-slider"
              />
              <div className="slider-bounds">
                <span>0.1%</span>
                <span>10%</span>
              </div>
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Penalty/Refund Cost Per Dispute</span>
                <span className="slider-value">${penaltyFee}</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="50" 
                step="1"
                value={penaltyFee}
                onChange={(e) => setPenaltyFee(Number(e.target.value))}
                className="custom-slider"
              />
              <div className="slider-bounds">
                <span>$5</span>
                <span>$50</span>
              </div>
            </div>

            <div className="slider-group">
              <div className="slider-header">
                <span className="slider-label">Manual Sync Work (Hours/Month)</span>
                <span className="slider-value">{laborHours} hrs</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="200" 
                step="5"
                value={laborHours}
                onChange={(e) => setLaborHours(Number(e.target.value))}
                className="custom-slider"
              />
              <div className="slider-bounds">
                <span>5 hrs</span>
                <span>200 hrs</span>
              </div>
            </div>
          </div>

          <div className="calculator-results">
            <div className="results-header">
              <h3>Estimated Monthly Value</h3>
              <p>Based on operational labor rate of $30/hr and enterprise platform fees.</p>
            </div>

            <div className="results-metrics">
              <div className="result-metric-card">
                <span className="metric-title">Avoided Platform Penalties</span>
                <span className="metric-number text-error">${penaltiesSaved.toLocaleString()}</span>
              </div>

              <div className="result-metric-card">
                <span className="metric-title">Recovered Labor Value</span>
                <span className="metric-number text-cyan">${laborSavedVal.toLocaleString()}</span>
              </div>

              <div className="result-metric-card total">
                <div className="metric-glow"></div>
                <span className="metric-title">Total Estimated Savings</span>
                <span className="metric-number text-success">${totalSavings.toLocaleString()}/mo</span>
              </div>
            </div>

            <div className="roi-output-footer">
              <div className="roi-stat">
                <span className="roi-label">OmniSync Cost</span>
                <span className="roi-val">${subscriptionCost}/mo</span>
              </div>
              <div className="roi-stat">
                <span className="roi-label">Calculated ROI</span>
                <span className="roi-val text-success">+{roiPercentage}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before vs After Section */}
      <section className="workflow-section">
        <div className="section-header">
          <h2 className="section-title">Operational Workflow Transformation</h2>
          <p className="section-subtitle">A direct comparison of traditional warehousing headaches vs. OmniSync’s automated event stream.</p>
        </div>

        <div className="workflow-grid">
          <div className="wf-card glass-card before">
            <div className="wf-badge badge badge-error">Without OmniSync</div>
            <h3>Manual Chaos & Delays</h3>
            <ul className="wf-steps">
              <li>
                <div className="step-num">1</div>
                <div>
                  <h4>Periodic Stock Take</h4>
                  <p>Warehouse staff manually audit physical listings and export spreadsheets periodically.</p>
                </div>
              </li>
              <li>
                <div className="step-num">2</div>
                <div>
                  <h4>Manual File Uploads</h4>
                  <p>Operations upload CSV sheets separately to Shopee, Lazada, and TikTok Shop portals.</p>
                </div>
              </li>
              <li>
                <div className="step-num">3</div>
                <div>
                  <h4>Silent Stockouts & Mismatches</h4>
                  <p>Unsynchronized listings lead to overselling during sales spikes, prompting heavy penalty disputes.</p>
                </div>
              </li>
              <li>
                <div className="step-num">4</div>
                <div>
                  <h4>Difficult Resolution</h4>
                  <p>Failures are undocumented, requiring tedious database reconstruction and customer refunds.</p>
                </div>
              </li>
            </ul>
          </div>

          <div className="wf-card glass-card after">
            <div className="wf-badge badge badge-success">With OmniSync</div>
            <h3>Automated Event Orchestration</h3>
            <ul className="wf-steps">
              <li>
                <div className="step-num">1</div>
                <div>
                  <h4>Barcode Adjustments</h4>
                  <p>Barcode scans instantly trigger database inventory updates inside physical warehouses.</p>
                </div>
              </li>
              <li>
                <div className="step-num">2</div>
                <div>
                  <h4>BullMQ Queue Broker</h4>
                  <p>OmniSync captures adjustments and streams events asynchronously to the outbound queue broker.</p>
                </div>
              </li>
              <li>
                <div className="step-num">3</div>
                <div>
                  <h4>Dynamic Rate Shaper</h4>
                  <p>Queue workers shapes API dispatches to fully comply with Shopee, Lazada, and TikTok Shop request quotas.</p>
                </div>
              </li>
              <li>
                <div className="step-num">4</div>
                <div>
                  <h4>Protected DLQ & Recovers</h4>
                  <p>Failed callbacks isolate inside the central controller dashboard for immediate, single-click manual recovery.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Synchronization Pipelines Visual */}
      <section className="pipelines-section">
        <div className="section-header">
          <h2 className="section-title">OmniSync Core Pipelines</h2>
          <p className="section-subtitle">Understand how data moves securely between physical stocks and storefront platforms.</p>
        </div>

        <div className="pipelines-container glass-card">
          <div className="pipelines-tabs">
            <button 
              className={`tab-btn ${activePipeline === 'stock' ? 'active' : ''}`}
              onClick={() => setActivePipeline('stock')}
            >
              Stock Broadcast Flow
            </button>
            <button 
              className={`tab-btn ${activePipeline === 'order' ? 'active' : ''}`}
              onClick={() => setActivePipeline('order')}
            >
              Order Ingestion Flow
            </button>
          </div>

          <div className="pipelines-display">
            {activePipeline === 'stock' ? (
              <div className="pipeline-flow">
                <div className="flow-step glass-card">
                  <div className="flow-num">1</div>
                  <h4>WMS Stock Adjustment</h4>
                  <p>Physical inventory change is detected via standard barcode scanning or ERP entry.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step glass-card highlight-cyan">
                  <div className="flow-num">2</div>
                  <h4>Outbound Event Broker</h4>
                  <p>NestJS server registers the change and schedules BullMQ queue jobs for multi-channel broadcasts.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step glass-card highlight-indigo">
                  <div className="flow-num">3</div>
                  <h4>Quota Compliance Guard</h4>
                  <p>Dynamic rate limiters control dispatch rates per seller account to protect API connections from bans.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step glass-card">
                  <div className="flow-num">4</div>
                  <h4>Marketplace Updates</h4>
                  <p>Store listings on Shopee, Lazada, and TikTok Shop update successfully within &lt; 2 seconds.</p>
                </div>
              </div>
            ) : (
              <div className="pipeline-flow">
                <div className="flow-step glass-card">
                  <div className="flow-num">1</div>
                  <h4>Customer Purchase</h4>
                  <p>Customer buys a product listing on TikTok Shop, Shopee, or Lazada storefront.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step glass-card highlight-cyan">
                  <div className="flow-num">2</div>
                  <h4>Secure Webhook Ingestion</h4>
                  <p>Fastify backend captures incoming webhooks, validates signatures, and checks idempotency filters.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step glass-card highlight-indigo">
                  <div className="flow-num">3</div>
                  <h4>Reliable Worker Execution</h4>
                  <p>Queue workers validate variant mapping, log transitions, and resolve sync payloads securely.</p>
                </div>
                <div className="flow-arrow">➔</div>
                <div className="flow-step glass-card">
                  <div className="flow-num">4</div>
                  <h4>WMS Order Generation</h4>
                  <p>Order is safely committed to the central WMS database for physical picking and packing operations.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="cta-footer-section">
        <div className="cta-footer-card glass-card">
          <h2>Bring Operational Excellence to Your Store</h2>
          <p>Gain absolute control over order tracking, inventory synchronization, and marketplace token health today.</p>
          <div className="cta-actions">
            <a href="http://localhost:3000/login" className="btn-primary cta-btn">
              <span>Access Control Portal</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
            <a href="/" className="btn-secondary cta-btn">
              Return to Home Page
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; 2026 OmniSync Platform. All rights reserved. Enterprise Warehousing Integrations.</p>
      </footer>

      {/* Custom Styles specific to Business Overview Page */}
      <style jsx>{`
        .landing-page-container {
          min-height: 100vh;
          background-color: #05070f;
          color: #f8fafc;
          position: relative;
          overflow-x: hidden;
        }

        /* Ambient glows */
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

        .nav-links a:hover, .nav-links a.active {
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

        .metrics-box-container {
          background: rgba(16, 22, 38, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          overflow: hidden;
          padding: 24px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .metrics-box-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 24px;
          position: relative;
        }

        .dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .metrics-box-title {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-left: 10px;
        }

        .metrics-box-body {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .impact-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .impact-icon-wrapper {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .impact-icon-wrapper.success { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .impact-icon-wrapper.primary { background: rgba(99, 102, 241, 0.1); color: #6366f1; }
        .impact-icon-wrapper.cyan { background: rgba(6, 182, 212, 0.1); color: #06b6d4; }

        .impact-icon-wrapper svg {
          width: 20px;
          height: 20px;
        }

        .impact-text h3 {
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: #f8fafc;
        }

        .impact-text p {
          font-size: 0.88rem;
          line-height: 1.45;
          color: #94a3b8;
        }

        /* Use Cases Section */
        .use-cases-section {
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
          font-size: 1.05rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .use-cases-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .use-case-card {
          padding: 32px;
          background: rgba(16, 22, 38, 0.4);
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .use-case-tag {
          margin-bottom: 16px;
        }

        .use-case-card h3 {
          font-size: 1.35rem;
          font-weight: 700;
          margin-bottom: 14px;
          color: #f8fafc;
        }

        .use-case-card p {
          font-size: 0.92rem;
          line-height: 1.55;
          color: #cbd5e1;
          margin-bottom: 24px;
          flex-grow: 1;
        }

        .use-case-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .val-pill {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 4px;
        }

        /* ROI Section & Calculator */
        .roi-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .roi-calculator-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          background: rgba(16, 22, 38, 0.5);
          padding: 48px;
          border-radius: 24px;
          align-items: center;
        }

        .calculator-controls h3 {
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .controls-intro {
          font-size: 0.95rem;
          color: #94a3b8;
          margin-bottom: 32px;
        }

        .slider-group {
          margin-bottom: 24px;
        }

        .slider-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 0.92rem;
        }

        .slider-label {
          color: #cbd5e1;
          font-weight: 500;
        }

        .slider-value {
          color: #06b6d4;
          font-weight: 700;
          font-family: monospace;
          font-size: 1.05rem;
        }

        .custom-slider {
          width: 100%;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.06);
          height: 6px;
          border-radius: 3px;
          outline: none;
        }

        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #6366f1;
          cursor: pointer;
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.6);
          transition: transform 0.1s ease;
        }

        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.25);
        }

        .slider-bounds {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: #64748b;
          margin-top: 4px;
        }

        .calculator-results {
          background: rgba(9, 13, 22, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 20px;
          padding: 36px;
          display: flex;
          flex-direction: column;
        }

        .results-header {
          margin-bottom: 28px;
        }

        .results-header h3 {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .results-header p {
          font-size: 0.82rem;
          color: #64748b;
        }

        .results-metrics {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 28px;
        }

        .result-metric-card {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 16px 20px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .result-metric-card.total {
          background: rgba(99, 102, 241, 0.06);
          border: 1px solid rgba(99, 102, 241, 0.2);
          position: relative;
          overflow: hidden;
        }

        .result-metric-card.total .metric-glow {
          position: absolute;
          width: 150px;
          height: 150px;
          background: #6366f1;
          filter: blur(40px);
          opacity: 0.15;
          right: -20px;
          top: -20px;
          pointer-events: none;
        }

        .metric-title {
          font-size: 0.9rem;
          font-weight: 500;
          color: #94a3b8;
        }

        .metric-number {
          font-size: 1.35rem;
          font-weight: 700;
          font-family: monospace;
        }

        .result-metric-card.total .metric-title {
          color: #f8fafc;
          font-weight: 600;
        }

        .result-metric-card.total .metric-number {
          font-size: 1.6rem;
        }

        .text-error { color: #ef4444; }
        .text-cyan { color: #06b6d4; }
        .text-success { color: #10b981; }

        .roi-output-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 20px;
          display: flex;
          justify-content: space-around;
          text-align: center;
        }

        .roi-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .roi-label {
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 700;
        }

        .roi-val {
          font-size: 1.4rem;
          font-weight: 700;
        }

        /* Operations Workflow Comparison */
        .workflow-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .workflow-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .wf-card {
          padding: 40px;
          border-radius: 24px;
          background: rgba(16, 22, 38, 0.4);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .wf-badge {
          margin-bottom: 24px;
        }

        .wf-card h3 {
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 32px;
        }

        .wf-steps {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 24px;
          width: 100%;
        }

        .wf-steps li {
          display: flex;
          align-items: flex-start;
          gap: 20px;
        }

        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.88rem;
          font-weight: 700;
          color: #cbd5e1;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .before .step-num {
          border-color: rgba(239, 68, 68, 0.15);
          background: rgba(239, 68, 68, 0.03);
          color: #ef4444;
        }

        .after .step-num {
          border-color: rgba(16, 185, 129, 0.15);
          background: rgba(16, 185, 129, 0.03);
          color: #10b981;
        }

        .wf-steps h4 {
          font-size: 1.05rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: #f8fafc;
        }

        .wf-steps p {
          font-size: 0.88rem;
          line-height: 1.5;
          color: #94a3b8;
        }

        /* Pipelines Visual */
        .pipelines-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 80px 24px;
          position: relative;
          z-index: 10;
        }

        .pipelines-container {
          background: rgba(16, 22, 38, 0.4);
          padding: 36px;
          border-radius: 24px;
        }

        .pipelines-tabs {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 36px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 20px;
        }

        .tab-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 18px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .tab-btn:hover {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.02);
        }

        .tab-btn.active {
          color: #6366f1;
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .pipeline-flow {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
          align-items: center;
          gap: 12px;
        }

        .flow-step {
          padding: 24px;
          background: rgba(9, 13, 22, 0.5);
          border-radius: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          align-items: flex-start;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .flow-step.highlight-cyan {
          border-color: rgba(6, 182, 212, 0.2);
          box-shadow: 0 0 16px rgba(6, 182, 212, 0.04);
        }

        .flow-step.highlight-indigo {
          border-color: rgba(99, 102, 241, 0.2);
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.04);
        }

        .flow-num {
          font-size: 0.72rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .flow-step.highlight-cyan .flow-num { color: #06b6d4; }
        .flow-step.highlight-indigo .flow-num { color: #6366f1; }

        .flow-step h4 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 8px;
          color: #f8fafc;
        }

        .flow-step p {
          font-size: 0.78rem;
          line-height: 1.5;
          color: #94a3b8;
        }

        .flow-arrow {
          font-size: 1.4rem;
          color: #334155;
          user-select: none;
          text-align: center;
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
          background: linear-gradient(135deg, rgba(16, 22, 38, 0.7) 0%, rgba(9, 13, 22, 0.9) 100%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
        }

        .cta-footer-card h2 {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .cta-footer-card p {
          font-size: 1.1rem;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto 36px;
          line-height: 1.6;
        }

        .cta-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
        }

        .cta-btn {
          padding: 14px 28px;
          font-size: 1rem;
        }

        /* Footer */
        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          padding: 40px 24px;
          text-align: center;
          font-size: 0.85rem;
          color: #64748b;
          position: relative;
          z-index: 10;
        }

        /* Responsive Breakpoints */
        @media (max-width: 992px) {
          .hero-section {
            grid-template-columns: 1fr;
            padding-top: 120px;
            gap: 40px;
          }
          
          .use-cases-grid {
            grid-template-columns: 1fr;
          }

          .roi-calculator-grid {
            grid-template-columns: 1fr;
            padding: 32px;
            gap: 36px;
          }

          .workflow-grid {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .pipeline-flow {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .flow-arrow {
            transform: rotate(90deg);
            margin: 4px 0;
          }
        }

        @media (max-width: 600px) {
          .hero-title {
            font-size: 2.4rem;
          }

          .cta-actions {
            flex-direction: column;
            width: 100%;
          }

          .cta-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

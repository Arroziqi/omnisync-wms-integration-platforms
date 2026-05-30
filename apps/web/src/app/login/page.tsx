"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If already logged in, skip login
    if (localStorage.getItem('access_token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
      const response = await fetch(`${apiBase}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials. Please try again.');
      }

      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Success animation delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please connect to the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background Animated Gradients */}
      <div className="gradient-glow glow-1"></div>
      <div className="gradient-glow glow-2"></div>

      <div className="login-card glass-card">
        <div className="login-header">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            <span className="logo-text">Omni<span>Sync</span></span>
          </div>
          <h1 className="gradient-text">Welcome back</h1>
          <p className="subtitle">WMS Enterprise Integration Hub</p>
        </div>

        {error && (
          <div className="error-alert">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              className="form-input"
              type="email"
              id="email"
              placeholder="admin@omnisync.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              className="form-input"
              type="password"
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button className="btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Secure Enterprise-Grade Multi-Channel Integration</p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #05070f;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient Glows */
        .gradient-glow {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.15;
          z-index: 1;
          pointer-events: none;
        }

        .glow-1 {
          width: 500px;
          height: 500px;
          background: #6366f1;
          top: -100px;
          left: -100px;
          animation: floatGlow 15s ease-in-out infinite alternate;
        }

        .glow-2 {
          width: 400px;
          height: 400px;
          background: #06b6d4;
          bottom: -100px;
          right: -100px;
          animation: floatGlow 12s ease-in-out infinite alternate-reverse;
        }

        @keyframes floatGlow {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 30px) scale(1.1); }
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
          border-radius: 24px;
          padding: 40px;
          background: rgba(13, 18, 33, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
          animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .logo svg {
          width: 32px;
          height: 32px;
          color: #6366f1;
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.5));
        }

        .logo-text {
          font-size: 1.6rem;
          font-weight: 700;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .logo-text span {
          color: #06b6d4;
        }

        .subtitle {
          font-size: 0.9rem;
          color: #64748b;
          margin-top: 4px;
        }

        .error-alert {
          background: rgba(239, 68, 68, 0.09);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 12px;
          padding: 12px 16px;
          color: #fca5a5;
          font-size: 0.88rem;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        .error-alert svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          color: #ef4444;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .login-btn {
          width: 100%;
          height: 48px;
          margin-top: 8px;
          font-size: 1rem;
        }

        .btn-icon {
          width: 18px;
          height: 18px;
          transition: transform 0.2s ease;
        }

        .login-btn:hover .btn-icon {
          transform: translateX(4px);
        }

        .spinner {
          width: 22px;
          height: 22px;
          border: 2.5px solid rgba(255, 255, 255, 0.2);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 24px;
        }

        .login-footer p {
          font-size: 0.75rem;
          color: #475569;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}

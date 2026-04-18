import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <header className="mobile-header">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
            <rect width="18" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="6.25" width="18" height="1.5" rx="0.75" fill="currentColor"/>
            <rect y="12.5" width="18" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
        </button>
      </header>

      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`sidebar-wrapper${sidebarOpen ? ' sidebar-wrapper--open' : ''}`}>
        <Sidebar />
      </div>

      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }

        /* ── Mobile header (hidden on desktop) ── */
        .mobile-header {
          display: none;
        }

        /* ── Sidebar ── */
        .sidebar-wrapper {
          width: 200px;
          flex-shrink: 0;
        }

        .sidebar {
          width: 200px;
          height: 100%;
          background: var(--bg-sidebar);
          border-right: var(--border-card);
          padding: calc(var(--spacing) * 3) 0;
        }

        .sidebar-logo {
          padding: 0 calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 4);
          font-size: var(--text-lg);
          font-weight: 600;
          letter-spacing: -0.2px;
          color: var(--text-primary);
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
        }

        .sidebar-link {
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          font-size: 13px;
          color: var(--text-secondary);
          transition: color 0.15s, background 0.15s;
        }

        .sidebar-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .sidebar-link--active {
          color: var(--text-primary);
          background: rgba(108, 140, 255, 0.12);
        }

        .sidebar-overlay {
          display: none;
        }

        /* ── Main content ── */
        .main-content {
          flex: 1;
          padding: calc(var(--spacing) * 2.5);
          overflow-y: auto;
          min-width: 0;
        }

        /* ── Mobile layout ── */
        @media (max-width: 768px) {
          .app-layout {
            flex-direction: column;
          }

          .mobile-header {
            display: flex;
            align-items: center;
            gap: calc(var(--spacing) * 1.5);
            padding: 0 calc(var(--spacing) * 2);
            height: 48px;
            background: var(--bg-sidebar);
            border-bottom: var(--border-card);
            position: sticky;
            top: 0;
            z-index: 10;
            flex-shrink: 0;
          }

          .hamburger {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            cursor: pointer;
            margin: 0 -12px 0 -12px;
          }

          .hamburger:hover {
            color: var(--text-primary);
          }

          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            z-index: 20;
          }

          .sidebar-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            width: 220px;
            z-index: 30;
            transform: translateX(-100%);
            transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .sidebar-wrapper--open {
            transform: translateX(0);
          }

          .sidebar {
            width: 100%;
            overflow-y: auto;
          }

          .sidebar-link {
            padding: calc(var(--spacing) * 2) calc(var(--spacing) * 2);
          }

          .main-content {
            padding: calc(var(--spacing) * 2);
          }
        }
      `}</style>
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>

      <style>{`
        .app-layout {
          display: flex;
          min-height: 100vh;
        }

        .sidebar {
          width: 200px;
          flex-shrink: 0;
          background: var(--bg-sidebar);
          border-right: var(--border-card);
          padding: calc(var(--spacing) * 3) 0;
        }

        .sidebar-logo {
          padding: 0 calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 4);
          font-size: 17px;
          font-weight: 500;
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
          border-left: 3px solid transparent;
          transition: color 0.15s;
        }

        .sidebar-link:hover {
          color: var(--text-primary);
        }

        .sidebar-link--active {
          color: var(--text-primary);
          border-left-color: var(--accent-blue);
          background: rgba(108, 140, 255, 0.05);
        }

        .main-content {
          flex: 1;
          padding: calc(var(--spacing) * 2.5);
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}

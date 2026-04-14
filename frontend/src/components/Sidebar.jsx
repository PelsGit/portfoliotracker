import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Overview' },
  { path: '/holdings', label: 'Holdings' },
  { path: '/breakdown', label: 'Breakdown' },
  { path: '/performance', label: 'Performance' },
  { path: '/calendar', label: 'Calendar' },
  { path: '/dividends', label: 'Dividends' },
  { path: '/import', label: 'Import Broker Actions' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Portfolio Tracker</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link${isActive ? ' sidebar-link--active' : ''}`
            }
            end={item.path === '/'}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

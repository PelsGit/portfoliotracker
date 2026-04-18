import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';

const ALL_COLUMNS = [
  { id: 'value',           key: 'value',               label: 'Portfolio worth',    align: 'right', type: 'currency' },
  { id: 'current_price',   key: 'current_price_local',  label: 'Current price',      align: 'right', type: 'local_price' },
  { id: 'shares',          key: 'shares',               label: 'Shares',             align: 'right', type: 'shares' },
  { id: 'cost_basis',      key: 'cost_basis',           label: 'Total invested',      align: 'right', type: 'currency' },
  { id: 'avg_cost',        key: 'avg_cost',             label: 'Avg price',          align: 'right', type: 'currency' },
  { id: 'holding_period',  key: 'holding_period_days',  label: 'Holding period',     align: 'right', type: 'period' },
  { id: 'dividends',       key: 'dividends_total',      label: 'Dividends',          align: 'right', type: 'currency' },
  { id: 'return_eur',      key: 'return_eur',           label: 'Unrealised P&L',     align: 'right', type: 'pnl' },
  { id: 'return_pct',      key: 'return_pct',           label: 'Unrealised P&L %',   align: 'right', type: 'pct_badge' },
  { id: 'realised_pnl',    key: 'realised_pnl',         label: 'Realised P&L',       align: 'right', type: 'pnl' },
  { id: 'realised_pnl_pct',key: 'realised_pnl_pct',    label: 'Realised P&L %',     align: 'right', type: 'pct_badge' },
  { id: 'total_pnl',       key: 'total_pnl',            label: 'Total P&L',          align: 'right', type: 'pnl' },
  { id: 'total_pnl_pct',   key: 'total_pnl_pct',        label: 'Total P&L %',        align: 'right', type: 'pct_badge' },
  { id: 'cost_basis_disp', key: 'cost_basis',           label: 'Cost basis',         align: 'right', type: 'currency' },
  { id: 'weight',          key: 'weight',               label: 'Portfolio weight',   align: 'right', type: 'weight_bar' },
];

const DEFAULT_VISIBLE = ['value', 'return_eur', 'weight'];

function formatPeriod(days) {
  if (days == null) return '—';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months > 0 ? `${years}y ${months}mo` : `${years}y`;
}

function formatCell(col, value, holding) {
  if (col.type === 'weight_bar') {
    return <WeightBar value={value} />;
  }
  if (value == null) return '—';
  switch (col.type) {
    case 'currency':    return formatCurrency(value);
    case 'local_price': return formatCurrency(value, holding.currency || 'EUR');
    case 'shares':      return formatNumber(value, 4);
    case 'period':      return formatPeriod(value);
    case 'pnl':         return <PnlCell value={value} />;
    case 'pct_badge':   return <PctBadge value={value} />;
    default:            return value;
  }
}

function PnlCell({ value }) {
  if (value == null) return <span className="text-muted">—</span>;
  const cls = value >= 0 ? 'pnl-pos' : 'pnl-neg';
  return <span className={cls}>{formatCurrency(value)}</span>;
}

function PctBadge({ value }) {
  if (value == null) return <span className="text-muted">—</span>;
  const type = value >= 0 ? 'positive' : 'negative';
  return (
    <span className={`return-badge return-badge--${type}`}>
      {formatPercent(value)}
    </span>
  );
}

function WeightBar({ value }) {
  if (value == null) return <span className="text-muted">—</span>;
  return (
    <div className="weight-cell">
      <span className="weight-label">{formatPercent(value)}</span>
      <div className="weight-track">
        <div className="weight-fill" style={{ width: `${Math.min(Number(value), 100)}%` }} />
      </div>
    </div>
  );
}

export default function HoldingsTable({ holdings }) {
  const [sortKey, setSortKey] = useState('value');
  const [sortDir, setSortDir] = useState('desc');
  const [visibleIds, setVisibleIds] = useState(DEFAULT_VISIBLE);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    api.get('/api/settings/holdings-columns')
      .then((res) => {
        if (res.data?.columns?.length) setVisibleIds(res.data.columns);
      })
      .catch(() => {})
      .finally(() => setSettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    api.put('/api/settings/holdings-columns', { columns: visibleIds }).catch(() => {});
  }, [visibleIds, settingsLoaded]);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const activeColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleIds.includes(c.id)),
    [visibleIds],
  );

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = useMemo(() => [...holdings].sort((a, b) => {
    const aVal = a[sortKey] != null ? Number(a[sortKey]) : -Infinity;
    const bVal = b[sortKey] != null ? Number(b[sortKey]) : -Infinity;
    if (isNaN(aVal) && isNaN(bVal)) return String(a[sortKey]).localeCompare(String(b[sortKey])) * (sortDir === 'asc' ? 1 : -1);
    if (isNaN(aVal)) return sortDir === 'asc' ? -1 : 1;
    if (isNaN(bVal)) return sortDir === 'asc' ? 1 : -1;
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }), [holdings, sortKey, sortDir]);

  const toggleColumn = (id) => {
    setVisibleIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const CASH_HIDDEN = new Set(['current_price', 'shares', 'avg_cost', 'holding_period', 'return_eur', 'return_pct', 'realised_pnl', 'realised_pnl_pct', 'total_pnl', 'total_pnl_pct']);

  return (
    <div className="holdings-card">
      <div className="ht-toolbar">
        <div className="ht-layout-menu" ref={menuRef}>
          <button
            className="ht-layout-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            Table layout
            <span aria-hidden="true"> ▾</span>
          </button>
          {menuOpen && (
            <div className="ht-menu" role="menu">
              {ALL_COLUMNS.map((col) => (
                <label key={col.id} className="ht-menu-item">
                  <input
                    type="checkbox"
                    checked={visibleIds.includes(col.id)}
                    onChange={() => toggleColumn(col.id)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="ht-scroll">
        <table className="holdings-table">
          <thead>
            <tr>
              <th
                onClick={() => handleSort('product_name')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('product_name'); } }}
                tabIndex={0}
                aria-sort={sortKey === 'product_name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                Security
                {sortKey === 'product_name' && <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
              </th>
              {activeColumns.map((col) => (
                <th
                  key={col.id}
                  className="text-right"
                  onClick={() => handleSort(col.key)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort(col.key); } }}
                  tabIndex={0}
                  aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {col.label}
                  {sortKey === col.key && <span className="sort-indicator" aria-hidden="true">{sortDir === 'asc' ? ' ▲' : ' ▼'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((holding) => (
              <tr key={holding.isin} className={holding.is_cash ? 'cash-row' : ''}>
                <td>
                  <span className="name-cell">
                    {holding.is_cash ? (
                      <svg className="cash-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="9" cy="9" r="8.5" stroke="currentColor" strokeOpacity="0.4"/>
                        <text x="9" y="13" textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor" fontFamily="system-ui,sans-serif">€</text>
                      </svg>
                    ) : holding.logo_url ? (
                      <img
                        src={holding.logo_url}
                        alt=""
                        className="holding-logo"
                        loading="lazy"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : null}
                    {holding.product_name || holding.isin}
                  </span>
                </td>
                {activeColumns.map((col) => (
                  <td key={col.id} className="text-right">
                    {holding.is_cash && CASH_HIDDEN.has(col.id)
                      ? <span className="text-muted">—</span>
                      : formatCell(col, holding[col.key], holding)
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .holdings-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          overflow: hidden;
        }

        .ht-toolbar {
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          border-bottom: 1px solid var(--border-row);
        }

        .ht-layout-menu {
          position: relative;
          display: inline-block;
        }

        .ht-layout-btn {
          background: var(--bg-secondary);
          border: var(--border-card);
          border-radius: var(--radius);
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          padding: 5px 10px;
        }

        .ht-layout-btn:hover {
          color: var(--text-primary);
        }

        .ht-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          z-index: 50;
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 1) 0;
          min-width: 200px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }

        .ht-menu-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px calc(var(--spacing) * 2);
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          user-select: none;
        }

        .ht-menu-item:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .ht-menu-item input[type="checkbox"] {
          accent-color: var(--accent-blue);
          flex-shrink: 0;
        }

        .ht-scroll {
          overflow-x: auto;
        }

        .holdings-table {
          width: 100%;
          border-collapse: collapse;
        }

        .holdings-table th {
          font-size: var(--text-xs);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-muted);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          text-align: left;
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }

        .holdings-table th:hover {
          color: var(--text-secondary);
        }

        .holdings-table td {
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          border-top: 1px solid var(--border-row);
          font-size: var(--text-base);
          color: var(--text-secondary);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        .holdings-table .text-right {
          text-align: right;
        }

        .name-cell {
          color: var(--text-primary);
          font-weight: 500;
          display: flex;
          align-items: center;
        }

        .cash-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          margin-right: 8px;
          color: var(--text-muted);
        }

        .holding-logo {
          width: 18px;
          height: 18px;
          border-radius: 3px;
          object-fit: contain;
          margin-right: 8px;
          flex-shrink: 0;
          background: var(--bg-secondary);
        }

        .cash-row td {
          color: var(--text-muted);
        }

        .cash-row .name-cell {
          color: var(--text-secondary);
          font-weight: 400;
        }

        .text-muted {
          color: var(--text-muted);
        }

        .sort-indicator {
          font-size: 9px;
          color: var(--accent-blue);
        }

        .return-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .return-badge--positive {
          background: var(--positive-bg);
          color: var(--positive);
        }

        .return-badge--negative {
          background: var(--negative-bg);
          color: var(--negative);
        }

        .pnl-pos {
          color: var(--positive);
        }

        .pnl-neg {
          color: var(--negative);
        }

        .weight-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
          min-width: 90px;
        }

        .weight-label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .weight-track {
          width: 80px;
          height: 3px;
          background: var(--border-row);
          border-radius: 2px;
          overflow: hidden;
        }

        .weight-fill {
          height: 100%;
          background: var(--accent-blue);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
}

import { useState } from 'react';
import { formatCurrency, formatNumber, formatPercent } from '../utils/format';

const COMPACT_COLUMNS = [
  { key: 'product_name', label: 'Name' },
  { key: 'value', label: 'Value', align: 'right' },
  { key: 'return_pct', label: 'Return', align: 'right' },
  { key: 'weight', label: 'Weight', align: 'right' },
];

const FULL_COLUMNS = [
  { key: 'product_name', label: 'Name' },
  { key: 'isin', label: 'ISIN' },
  { key: 'shares', label: 'Shares', align: 'right' },
  { key: 'avg_cost', label: 'Avg Cost', align: 'right' },
  { key: 'current_price', label: 'Price', align: 'right' },
  { key: 'value', label: 'Value', align: 'right' },
  { key: 'return_pct', label: 'Return', align: 'right' },
  { key: 'weight', label: 'Weight', align: 'right' },
];

function formatCell(key, value) {
  if (value == null) return '—';
  switch (key) {
    case 'value':
    case 'avg_cost':
    case 'current_price':
      return formatCurrency(value);
    case 'shares':
      return formatNumber(value, 4);
    case 'return_pct':
    case 'weight':
      return formatPercent(value);
    default:
      return value;
  }
}

function ReturnBadge({ value }) {
  if (value == null) return <span>—</span>;
  const type = value >= 0 ? 'positive' : 'negative';
  return (
    <span className={`return-badge return-badge--${type}`}>
      {formatPercent(value)}
    </span>
  );
}

export default function HoldingsTable({ holdings, compact = false }) {
  const [sortKey, setSortKey] = useState('value');
  const [sortDir, setSortDir] = useState('desc');

  const columns = compact ? COMPACT_COLUMNS : FULL_COLUMNS;

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...holdings].sort((a, b) => {
    const aVal = a[sortKey] ?? -Infinity;
    const bVal = b[sortKey] ?? -Infinity;
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="holdings-card">
      <table className="holdings-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'right' ? 'text-right' : ''}
                onClick={() => handleSort(col.key)}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="sort-indicator">{sortDir === 'asc' ? ' \u25B2' : ' \u25BC'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((holding) => (
            <tr key={holding.isin}>
              {columns.map((col) => (
                <td key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
                  {col.key === 'product_name' ? (
                    <span className="name-cell">{holding.product_name || holding.isin}</span>
                  ) : col.key === 'return_pct' ? (
                    <ReturnBadge value={holding.return_pct} />
                  ) : (
                    formatCell(col.key, holding[col.key])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <style>{`
        .holdings-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          overflow: hidden;
        }

        .holdings-table {
          width: 100%;
          border-collapse: collapse;
        }

        .holdings-table th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          font-weight: 400;
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
          border-top: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 13px;
          color: var(--text-secondary);
        }

        .holdings-table .text-right {
          text-align: right;
        }

        .name-cell {
          color: var(--text-primary);
          font-weight: 500;
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
      `}</style>
    </div>
  );
}

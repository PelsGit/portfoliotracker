import { useMemo } from 'react';
import { formatPercent } from '../utils/format';

export default function TopHoldingsList({ holdings }) {
  const sorted = useMemo(() =>
    (holdings ?? [])
      .filter((h) => h.weight != null)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5),
    [holdings]
  );

  if (!sorted.length) {
    return <p className="top-empty">No holdings</p>;
  }

  return (
    <div className="top-holdings">
      {sorted.map((h) => (
        <div key={h.isin} className="top-holding-row">
          <span className="top-holding-name">{h.product_name || h.isin}</span>
          <span className="top-holding-weight">{formatPercent(h.weight)}</span>
          <div className="top-holding-bar-bg">
            <div
              className="top-holding-bar"
              style={{ width: `${Math.min(h.weight, 100)}%` }}
            />
          </div>
        </div>
      ))}

      <style>{`
        .top-holdings {
          display: flex;
          flex-direction: column;
          gap: calc(var(--spacing) * 1.5);
        }

        .top-empty {
          color: var(--text-muted);
          font-size: 13px;
          padding: calc(var(--spacing) * 4) 0;
          text-align: center;
        }

        .top-holding-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 4px calc(var(--spacing) * 1.5);
          align-items: center;
        }

        .top-holding-name {
          font-size: 12px;
          color: var(--text-primary);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .top-holding-weight {
          font-size: 12px;
          color: var(--text-secondary);
          text-align: right;
        }

        .top-holding-bar-bg {
          grid-column: 1 / -1;
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 2px;
          overflow: hidden;
        }

        .top-holding-bar {
          height: 100%;
          background: var(--accent-blue);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState } from 'react';
import api from '../api/client';
import MetricCard from '../components/MetricCard';

function fmt(value, decimals = 2) {
  if (value == null) return '—';
  return Number(value).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function MonthlyChart({ monthly }) {
  if (!monthly || monthly.length === 0) {
    return <p className="div-empty">No dividend history yet.</p>;
  }

  // Show last 24 months max
  const data = monthly.slice(-24);
  const max = Math.max(...data.map((d) => Number(d.amount_eur)), 0.01);

  return (
    <div className="div-chart-wrap">
      {data.map((d) => {
        const pct = (Number(d.amount_eur) / max) * 100;
        const [year, mon] = d.month.split('-');
        const label = new Date(Number(year), Number(mon) - 1).toLocaleString('en-GB', { month: 'short', year: '2-digit' });
        return (
          <div key={d.month} className="div-bar-col" title={`${d.month}: €${fmt(d.amount_eur)}`}>
            <div className="div-bar-track">
              <div className="div-bar-fill" style={{ height: `${pct}%` }} />
            </div>
            <span className="div-bar-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dividends({ standalone = true }) {
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loadingS, setLoadingS] = useState(true);
  const [loadingH, setLoadingH] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api.get('/api/portfolio/dividends/summary')
      .then((r) => setSummary(r.data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingS(false));

    api.get('/api/portfolio/dividends')
      .then((r) => setHistory(r.data))
      .catch(() => setHistory([]))
      .finally(() => setLoadingH(false));
  }, []);

  const visibleHistory = showAll ? history : history.slice(0, 20);

  return (
    <div>
      {standalone && <h1 className="page-title">Dividends</h1>}

      {/* Metric cards */}
      <div className="div-cards">
        <MetricCard
          label="Total received"
          value={loadingS ? '…' : `€${fmt(summary?.total_eur)}`}
        />
        <MetricCard
          label="This year"
          value={loadingS ? '…' : `€${fmt(summary?.this_year_eur)}`}
        />
        <MetricCard
          label="Monthly avg"
          value={loadingS ? '…' : `€${fmt(summary?.monthly_avg_eur)}`}
        />
        <MetricCard
          label="Paying holdings"
          value={loadingS ? '…' : String(summary?.paying_holdings ?? 0)}
        />
      </div>

      {/* Monthly bar chart */}
      <div className="div-section">
        <div className="div-section-title">Monthly income</div>
        {loadingS ? (
          <p className="div-empty">Loading…</p>
        ) : (
          <MonthlyChart monthly={summary?.monthly ?? []} />
        )}
      </div>

      {/* Per-holding table */}
      <div className="div-section">
        <div className="div-section-title">By holding</div>
        {loadingS ? (
          <p className="div-empty">Loading…</p>
        ) : !summary?.by_holding?.length ? (
          <p className="div-empty">No dividend data yet. Import a DeGiro CSV to get started.</p>
        ) : (
          <table className="div-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th className="div-td--right">Total received</th>
                <th className="div-td--right">Yield on cost</th>
              </tr>
            </thead>
            <tbody>
              {summary.by_holding.map((h) => (
                <tr key={h.isin}>
                  <td>
                    <span className="div-name">{h.product_name || h.isin}</span>
                    <span className="div-isin">{h.isin}</span>
                  </td>
                  <td className="div-td--right">€{fmt(h.total_eur)}</td>
                  <td className="div-td--right div-yoc">
                    {h.yield_on_cost != null ? `${fmt(h.yield_on_cost)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Full history */}
      <div className="div-section">
        <div className="div-section-title">Payment history</div>
        {loadingH ? (
          <p className="div-empty">Loading…</p>
        ) : !history.length ? (
          <p className="div-empty">No payments recorded yet.</p>
        ) : (
          <>
            <table className="div-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Stock</th>
                  <th className="div-td--right">Gross</th>
                  <th className="div-td--right">Withholding tax</th>
                  <th className="div-td--right">Net (EUR)</th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((d) => (
                  <tr key={`${d.isin}-${d.dividend_date}`}>
                    <td className="div-date">{d.dividend_date}</td>
                    <td>
                      <span className="div-name">{d.product_name || d.isin}</span>
                    </td>
                    <td className="div-td--right">
                      {d.local_currency} {fmt(d.local_amount, 4)}
                    </td>
                    <td className="div-td--right div-tax">
                      {d.withholding_tax_eur != null ? `€${fmt(d.withholding_tax_eur)}` : '—'}
                    </td>
                    <td className="div-td--right div-net">€{fmt(d.amount_eur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length > 20 && (
              <button className="div-show-more" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show less' : `Show all ${history.length} payments`}
              </button>
            )}
          </>
        )}
      </div>

      <style>{`
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 2);
        }

        .div-cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .div-section {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 3);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .div-section-title {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: calc(var(--spacing) * 2);
        }

        .div-empty {
          font-size: 13px;
          color: var(--text-muted);
        }

        /* Bar chart */
        .div-chart-wrap {
          display: flex;
          align-items: flex-end;
          gap: 4px;
          height: 120px;
          overflow-x: auto;
          padding-bottom: calc(var(--spacing) * 1);
        }

        .div-bar-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
          min-width: 28px;
        }

        .div-bar-track {
          width: 100%;
          height: 90px;
          display: flex;
          align-items: flex-end;
        }

        .div-bar-fill {
          width: 100%;
          background: var(--accent-blue, #6c8cff);
          border-radius: 3px 3px 0 0;
          min-height: 2px;
          opacity: 0.8;
          transition: opacity 0.15s;
        }

        .div-bar-col:hover .div-bar-fill { opacity: 1; }

        .div-bar-label {
          font-size: 9px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        /* Tables */
        .div-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .div-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-muted);
          padding: 6px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .div-table td {
          padding: 8px 8px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          color: var(--text-primary);
          vertical-align: middle;
        }

        .div-table tr:last-child td { border-bottom: none; }

        .div-td--right { text-align: right; }

        .div-name {
          display: block;
          font-size: 13px;
          color: var(--text-primary);
        }

        .div-isin {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
        }

        .div-date { color: var(--text-secondary); font-size: 12px; }
        .div-yoc  { color: var(--positive, #4ade80); }
        .div-tax  { color: var(--text-muted); }
        .div-net  { font-weight: 500; }

        .div-show-more {
          display: block;
          margin: calc(var(--spacing) * 2) auto 0;
          background: none;
          border: var(--border-card);
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: 12px;
          padding: 6px 16px;
          cursor: pointer;
        }

        .div-show-more:hover { color: var(--text-primary); }

        @media (max-width: 700px) {
          .div-cards { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState } from 'react';
import api from '../api/client';
import HoldingsTable from '../components/HoldingsTable';
import { formatCurrency, formatPercent } from '../utils/format';

export default function Holdings() {
  const [holdings, setHoldings] = useState([]);
  const [divByHolding, setDivByHolding] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDiv, setLoadingDiv] = useState(true);

  useEffect(() => {
    api
      .get('/api/portfolio/holdings')
      .then((res) => setHoldings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    api
      .get('/api/portfolio/dividends/summary')
      .then((res) => setDivByHolding(res.data.by_holding ?? []))
      .catch(() => setDivByHolding([]))
      .finally(() => setLoadingDiv(false));
  }, []);

  // Build logo lookup from holdings so we can show logos in the dividend section
  const logoByIsin = Object.fromEntries(
    holdings.filter((h) => h.logo_url).map((h) => [h.isin, h.logo_url])
  );
  const nameByIsin = Object.fromEntries(
    holdings.map((h) => [h.isin, h.product_name])
  );

  return (
    <div>
      <h1 className="page-title">Holdings</h1>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : !holdings.length ? (
        <div className="empty-state">
          <p>No holdings yet. Import transactions to see your positions.</p>
        </div>
      ) : (
        <HoldingsTable holdings={holdings} />
      )}

      {/* Dividends segment */}
      <div className="div-segment">
        <div className="div-segment-header">
          <span className="div-segment-title">Dividends</span>
          <span className="div-segment-sub">Total received per holding</span>
        </div>

        {loadingDiv ? (
          <p className="loading-text" style={{ padding: '0 0 8px' }}>Loading…</p>
        ) : !divByHolding.length ? (
          <p className="div-empty">No dividend payments recorded. Import a DeGiro CSV to populate this.</p>
        ) : (
          <table className="div-table">
            <thead>
              <tr>
                <th>Stock</th>
                <th className="text-right">Received</th>
                <th className="text-right">Yield on cost</th>
              </tr>
            </thead>
            <tbody>
              {divByHolding.map((d) => (
                <tr key={d.isin}>
                  <td>
                    <span className="name-cell">
                      {logoByIsin[d.isin] ? (
                        <img
                          src={logoByIsin[d.isin]}
                          alt=""
                          className="holding-logo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : null}
                      <span>
                        <span className="div-stock-name">{nameByIsin[d.isin] || d.product_name || d.isin}</span>
                        <span className="div-isin">{d.isin}</span>
                      </span>
                    </span>
                  </td>
                  <td className="text-right div-amount">{formatCurrency(d.total_eur)}</td>
                  <td className="text-right">
                    {d.yield_on_cost != null ? (
                      <span className="yoc-badge">{formatPercent(d.yield_on_cost)}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .loading-text {
          color: var(--text-muted);
          font-size: 13px;
        }

        .empty-state {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 6);
          text-align: center;
          color: var(--text-secondary);
        }

        .div-segment {
          margin-top: calc(var(--spacing) * 4);
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          overflow: hidden;
        }

        .div-segment-header {
          display: flex;
          align-items: baseline;
          gap: calc(var(--spacing) * 1.5);
          padding: calc(var(--spacing) * 2) calc(var(--spacing) * 2);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .div-segment-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .div-segment-sub {
          font-size: 11px;
          color: var(--text-muted);
        }

        .div-empty {
          font-size: 13px;
          color: var(--text-muted);
          padding: calc(var(--spacing) * 2);
        }

        .div-table {
          width: 100%;
          border-collapse: collapse;
        }

        .div-table th {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          font-weight: 400;
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          text-align: left;
        }

        .div-table td {
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 2);
          border-top: 1px solid rgba(255,255,255,0.04);
          font-size: 13px;
          color: var(--text-secondary);
        }

        .text-right { text-align: right; }

        .name-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .holding-logo {
          width: 18px;
          height: 18px;
          border-radius: 3px;
          object-fit: contain;
          flex-shrink: 0;
          background: var(--bg-secondary, #1e2533);
        }

        .div-stock-name {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .div-isin {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
        }

        .div-amount {
          font-weight: 500;
          color: var(--text-primary);
        }

        .yoc-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background: var(--positive-bg);
          color: var(--positive);
        }
      `}</style>
    </div>
  );
}

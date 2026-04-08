import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import HoldingsTable from '../components/HoldingsTable';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatPercent } from '../utils/format';

export default function Overview() {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [perf, setPerf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/api/portfolio/holdings'),
      api.get('/api/portfolio/summary'),
      api.get('/api/portfolio/performance?period=ALL'),
    ])
      .then(([holdingsRes, summaryRes, perfRes]) => {
        setHoldings(holdingsRes.data);
        setSummary(summaryRes.data);
        setPerf(perfRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Portfolio Overview</h1>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (!holdings.length) {
    return (
      <div>
        <h1 className="page-title">Portfolio Overview</h1>
        <div className="empty-state">
          <p>Import your DEGIRO transactions to see your portfolio breakdown.</p>
          <button className="btn-primary" onClick={() => navigate('/import')}>
            Import CSV
          </button>
        </div>

        <style>{`
          .empty-state {
            background: var(--bg-card);
            border: var(--border-card);
            border-radius: var(--radius);
            padding: calc(var(--spacing) * 6);
            text-align: center;
            color: var(--text-secondary);
          }

          .empty-state p {
            margin-bottom: calc(var(--spacing) * 2);
          }

          .btn-primary {
            background: var(--accent-blue);
            color: #fff;
            border: none;
            border-radius: var(--radius);
            padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 3);
            font-size: 13px;
            cursor: pointer;
          }

          .btn-primary:hover {
            opacity: 0.9;
          }
        `}</style>
      </div>
    );
  }

  const returnType = summary?.total_return_eur >= 0 ? 'positive' : 'negative';

  return (
    <div>
      <div className="overview-header">
        <h1 className="page-title">Portfolio Overview</h1>
        {summary?.last_import_date && (
          <span className="last-import">
            Last import: {new Date(summary.last_import_date).toLocaleDateString('nl-NL')}
          </span>
        )}
      </div>

      <div className="metrics-grid metrics-grid--4">
        <MetricCard
          label="Portfolio Value"
          value={formatCurrency(summary?.total_value)}
        />
        <MetricCard
          label="Total Return"
          value={formatCurrency(summary?.total_return_eur)}
          delta={formatPercent(summary?.total_return_pct)}
          deltaType={returnType}
        />
        <MetricCard
          label="TWR"
          value={perf?.twr != null ? formatPercent(perf.twr) : '\u2014'}
        />
        <MetricCard
          label="IRR"
          value={perf?.irr != null ? formatPercent(perf.irr) : '\u2014'}
        />
      </div>

      <div className="holdings-section">
        <h2 className="section-title">Holdings</h2>
        <HoldingsTable holdings={holdings} compact />
      </div>

      <style>{`
        .overview-header {
          display: flex;
          align-items: baseline;
          gap: calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .last-import {
          font-size: 12px;
          color: var(--text-muted);
        }

        .loading-text {
          color: var(--text-muted);
          font-size: 13px;
        }

        .metrics-grid {
          display: grid;
          gap: calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .metrics-grid--4 {
          grid-template-columns: repeat(4, 1fr);
        }

        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          font-weight: 400;
          margin-bottom: calc(var(--spacing) * 1.5);
        }

        .holdings-section {
          margin-bottom: calc(var(--spacing) * 3);
        }
      `}</style>
    </div>
  );
}

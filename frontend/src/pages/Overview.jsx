import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import DonutChart from '../components/DonutChart';
import HoldingsTable from '../components/HoldingsTable';
import HorizontalBarChart from '../components/HorizontalBarChart';
import MetricCard from '../components/MetricCard';
import TopHoldingsList from '../components/TopHoldingsList';
import { formatCurrency, formatPercent } from '../utils/format';

export default function Overview() {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [perf, setPerf] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchDashboard = () =>
    Promise.all([
      api.get('/api/portfolio/holdings'),
      api.get('/api/portfolio/summary'),
      api.get('/api/portfolio/performance?period=ALL'),
      api.get('/api/portfolio/breakdown'),
    ]).then(([holdingsRes, summaryRes, perfRes, breakdownRes]) => {
      setHoldings(holdingsRes.data);
      setSummary(summaryRes.data);
      setPerf(perfRes.data);
      setBreakdown(breakdownRes.data);
    });

  useEffect(() => {
    fetchDashboard()
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get('/api/prices/status').then((res) => {
      setLastRefresh(res.data.last_refresh);
      setRefreshing(res.data.refreshing);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!refreshing) return;
    const interval = setInterval(() => {
      api.get('/api/prices/status').then((res) => {
        if (!res.data.refreshing) {
          setRefreshing(false);
          setLastRefresh(res.data.last_refresh);
          clearInterval(interval);
          fetchDashboard().catch(() => {});
        }
      }).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [refreshing]);

  const handleRefresh = () => {
    setRefreshing(true);
    api.post('/api/prices/refresh').catch(() => setRefreshing(false));
  };

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
        <div className="header-actions">
          {summary?.last_import_date && (
            <span className="last-import">
              Last import: {new Date(summary.last_import_date).toLocaleDateString('nl-NL')}
            </span>
          )}
          {lastRefresh && (
            <span className="last-import">
              Prices updated: {new Date(lastRefresh).toLocaleString('nl-NL')}
            </span>
          )}
          <button
            className="btn-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Prices'}
          </button>
        </div>
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

      <div className="charts-row">
        <div className="chart-card">
          <h2 className="section-title">Sector</h2>
          <DonutChart data={breakdown?.sector} size="small" />
        </div>
        <div className="chart-card">
          <h2 className="section-title">Region</h2>
          <HorizontalBarChart data={breakdown?.region} compact />
        </div>
        <div className="chart-card">
          <h2 className="section-title">Top Holdings</h2>
          <TopHoldingsList holdings={holdings} />
        </div>
      </div>

      <div className="holdings-section">
        <h2 className="section-title">Holdings</h2>
        <HoldingsTable holdings={holdings} compact />
      </div>

      <style>{`
        .overview-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: calc(var(--spacing) * 2);
        }

        .last-import {
          font-size: 12px;
          color: var(--text-muted);
        }

        .btn-refresh {
          background: transparent;
          color: var(--accent-blue);
          border: 1px solid var(--accent-blue);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 0.75) calc(var(--spacing) * 2);
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .btn-refresh:hover:not(:disabled) {
          background: var(--accent-blue);
          color: #fff;
        }

        .btn-refresh:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .charts-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .chart-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 3);
        }

        .holdings-section {
          margin-bottom: calc(var(--spacing) * 3);
        }
      `}</style>
    </div>
  );
}

import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatPercent } from '../utils/format';

const PERIODS = ['1M', '3M', '6M', '1Y', 'YTD', 'All'];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { date, value } = payload[0].payload;
  return (
    <div className="perf-tooltip">
      <span className="perf-tooltip-value">{formatCurrency(value)}</span>
      <span className="perf-tooltip-date">{date}</span>
    </div>
  );
}

export default function Performance() {
  const [period, setPeriod] = useState('1Y');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/portfolio/performance?period=${period === 'All' ? 'ALL' : period}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const series = data?.time_series ?? [];
  const returnType =
    data?.total_return_eur != null
      ? data.total_return_eur >= 0
        ? 'positive'
        : 'negative'
      : 'neutral';
  const twrType =
    data?.twr != null ? (data.twr >= 0 ? 'positive' : 'negative') : 'neutral';
  const irrType =
    data?.irr != null ? (data.irr >= 0 ? 'positive' : 'negative') : 'neutral';
  const ddType =
    data?.max_drawdown != null && data.max_drawdown < 0 ? 'negative' : 'neutral';

  return (
    <div>
      <h1 className="page-title">Performance</h1>

      <div className="period-selector">
        {PERIODS.map((p) => (
          <button
            key={p}
            className={`period-btn${period === p ? ' period-btn--active' : ''}`}
            onClick={() => setPeriod(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="metrics-grid metrics-grid--4">
        <MetricCard
          label="Total Return"
          value={formatCurrency(data?.total_return_eur)}
          delta={formatPercent(data?.total_return_pct)}
          deltaType={returnType}
        />
        <MetricCard
          label="TWR"
          value={data?.twr != null ? formatPercent(data.twr) : '\u2014'}
          delta={
            data?.twr_cumulative != null
              ? `${formatPercent(data.twr_cumulative)} cum.`
              : undefined
          }
          deltaType={twrType}
        />
        <MetricCard
          label="IRR"
          value={data?.irr != null ? formatPercent(data.irr) : '\u2014'}
          deltaType={irrType}
        />
        <MetricCard
          label="Max Drawdown"
          value={data?.max_drawdown != null ? formatPercent(data.max_drawdown) : '\u2014'}
          deltaType={ddType}
        />
      </div>

      <div className="chart-card">
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : series.length === 0 ? (
          <p className="loading-text">No performance data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCurrency(v)}
                width={90}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#6c8cff"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <style>{`
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 2);
        }

        .period-selector {
          display: flex;
          gap: calc(var(--spacing) * 1);
          margin-bottom: calc(var(--spacing) * 2);
        }

        .period-btn {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: 12px;
          padding: calc(var(--spacing) * 0.75) calc(var(--spacing) * 2);
          cursor: pointer;
        }

        .period-btn:hover {
          color: var(--text-primary);
        }

        .period-btn--active {
          background: var(--accent-blue);
          color: #fff;
          border-color: var(--accent-blue);
        }

        .metrics-grid--4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: calc(var(--spacing) * 2);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .chart-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 3);
        }

        .loading-text {
          color: var(--text-muted);
          font-size: 13px;
        }

        .perf-tooltip {
          background: #1e2533;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .perf-tooltip-value {
          color: #fff;
          font-size: 13px;
          font-weight: 500;
        }

        .perf-tooltip-date {
          color: var(--text-muted);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

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

const BENCHMARK_COLORS = {
  'S&P 500': '#4ade80',
  'FTSE All-World': '#fb923c',
  'Nasdaq 100': '#c084fc',
};
const PORTFOLIO_COLOR = '#6c8cff';

function fmtPct(v) {
  if (v == null) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const date = payload[0]?.payload?.date;
  return (
    <div className="perf-tooltip">
      <span className="perf-tooltip-date">{date}</span>
      {payload.map((entry) => (
        <span key={entry.dataKey} className="perf-tooltip-row">
          <span className="perf-tooltip-dot" style={{ background: entry.color }} />
          <span className="perf-tooltip-label">{entry.name}</span>
          <span className="perf-tooltip-value" style={{ color: entry.value >= 0 ? '#4ade80' : '#f87171' }}>
            {fmtPct(entry.value)}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Performance() {
  const [period, setPeriod] = useState('1Y');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBenchmarks, setActiveBenchmarks] = useState(
    Object.keys(BENCHMARK_COLORS)
  );

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/portfolio/performance?period=${period === 'All' ? 'ALL' : period}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const series = data?.time_series ?? [];
  const benchmarks = data?.benchmarks ?? [];

  // Rebase everything to % return from the first data point (all lines start at 0%)
  const portfolioStart = series.length > 0 ? Number(series[0].value) : 1;

  // Build a lookup: benchmark name -> start value (first point's value, already rebased to portfolioStart)
  // Since benchmarks are rebased to portfolioStart on the backend, their start value == portfolioStart
  const chartData = series.map((pt) => {
    const pctPortfolio = ((Number(pt.value) / portfolioStart) - 1) * 100;
    const row = { date: pt.date, Portfolio: parseFloat(pctPortfolio.toFixed(2)) };
    for (const b of benchmarks) {
      const match = b.time_series.find((x) => x.date === pt.date);
      if (match) {
        const pct = ((Number(match.value) / portfolioStart) - 1) * 100;
        row[b.name] = parseFloat(pct.toFixed(2));
      }
    }
    return row;
  });

  const toggleBenchmark = (name) => {
    setActiveBenchmarks((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

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
          <>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={chartData}>
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
                  tickFormatter={(v) => (v >= 0 ? '+' : '') + v.toFixed(1) + '%'}
                  width={65}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Portfolio"
                  name="Portfolio"
                  stroke={PORTFOLIO_COLOR}
                  strokeWidth={2}
                  dot={false}
                />
                {benchmarks.map((b) =>
                  activeBenchmarks.includes(b.name) ? (
                    <Line
                      key={b.ticker}
                      type="monotone"
                      dataKey={b.name}
                      name={b.name}
                      stroke={BENCHMARK_COLORS[b.name] ?? '#888'}
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 2"
                    />
                  ) : null
                )}
              </LineChart>
            </ResponsiveContainer>

            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-dot" style={{ background: PORTFOLIO_COLOR }} />
                Portfolio
              </span>
              {benchmarks.map((b) => (
                <button
                  key={b.ticker}
                  className={`legend-item legend-item--btn${activeBenchmarks.includes(b.name) ? '' : ' legend-item--inactive'}`}
                  onClick={() => toggleBenchmark(b.name)}
                >
                  <span
                    className="legend-dot"
                    style={{ background: BENCHMARK_COLORS[b.name] ?? '#888' }}
                  />
                  {b.name}
                </button>
              ))}
            </div>
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
          gap: 4px;
          min-width: 160px;
        }

        .perf-tooltip-date {
          color: var(--text-muted);
          font-size: 11px;
          margin-bottom: 2px;
        }

        .perf-tooltip-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .perf-tooltip-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .perf-tooltip-label {
          color: var(--text-secondary);
          font-size: 12px;
          flex: 1;
        }

        .perf-tooltip-value {
          color: #fff;
          font-size: 12px;
          font-weight: 500;
        }

        .chart-legend {
          display: flex;
          gap: calc(var(--spacing) * 3);
          margin-top: calc(var(--spacing) * 2);
          justify-content: center;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .legend-item--btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.15s;
        }

        .legend-item--btn:hover {
          color: var(--text-primary);
        }

        .legend-item--inactive {
          opacity: 0.35;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

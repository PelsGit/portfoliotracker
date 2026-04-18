import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/client';
import MetricCard from '../components/MetricCard';
import { formatCurrency, formatPercent } from '../utils/format';

const PERIODS = ['1M', '3M', '6M', '1Y', 'YTD', 'All'];

const BENCHMARKS_META = [
  { name: 'S&P 500',        color: '#fbbf24' },
  { name: 'FTSE All-World', color: '#fb923c' },
  { name: 'Nasdaq 100',     color: '#a78bfa' },
];

// Mirrors --accent-blue token; kept as constant because Recharts props don't accept CSS vars
const PORTFOLIO_COLOR = '#6c8cff';

/** Forward-fill: given a sorted [{date,value}] array, find the last value ≤ targetDate */
function forwardFill(sortedSeries, targetDate) {
  let last = null;
  for (const pt of sortedSeries) {
    if (pt.date <= targetDate) last = Number(pt.value);
    else break;
  }
  return last;
}

function fmtPct(v) {
  if (v == null) return '—';
  return (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%';
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
          <span
            className="perf-tooltip-value"
            style={{ color: entry.value >= 0 ? 'var(--positive)' : 'var(--negative)' }}
          >
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
    BENCHMARKS_META.map((b) => b.name)
  );

  useEffect(() => {
    setLoading(true);
    api
      .get(`/api/portfolio/performance?period=${period === 'All' ? 'ALL' : period}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const twrSeries = data?.twr_series ?? [];
  const benchmarks = data?.benchmarks ?? [];

  const chartData = useMemo(
    () =>
      twrSeries.map((pt) => {
        const row = { date: pt.date, Portfolio: Number(pt.value) };
        for (const b of benchmarks) {
          row[b.name] = forwardFill(b.time_series, pt.date);
        }
        return row;
      }),
    [twrSeries, benchmarks]
  );

  const toggleBenchmark = (name) =>
    setActiveBenchmarks((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const returnType =
    data?.total_return_eur != null
      ? data.total_return_eur >= 0 ? 'positive' : 'negative'
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

      <div className="toolbar">
        <div
          role="group"
          aria-label="Time period"
          className="period-selector"
        >
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`period-btn${period === p ? ' period-btn--active' : ''}`}
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="benchmark-selector">
          {BENCHMARKS_META.map((b) => {
            const active = activeBenchmarks.includes(b.name);
            return (
              <button
                key={b.name}
                className={`benchmark-btn${active ? ' benchmark-btn--active' : ''}`}
                style={active ? { '--bm-color': b.color } : {}}
                onClick={() => toggleBenchmark(b.name)}
                aria-pressed={active}
              >
                <span
                  className="benchmark-dot"
                  style={{ background: active ? b.color : 'var(--text-muted)' }}
                />
                {b.name}
              </button>
            );
          })}
        </div>
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
        {loading && (
          <p role="status" aria-live="polite" className="loading-text">
            Loading…
          </p>
        )}
        {!loading && twrSeries.length === 0 && (
          <p className="loading-text">No performance data available.</p>
        )}
        {!loading && twrSeries.length > 0 && (
          <figure aria-label={`Portfolio performance — ${period}`} style={{ margin: 0 }}>
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart data={chartData}>
                <defs>
                  <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PORTFOLIO_COLOR} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={PORTFOLIO_COLOR} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-row)" />
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
                  tickFormatter={(v) => (v >= 0 ? '+' : '') + Number(v).toFixed(1) + '%'}
                  width={65}
                />
                <ReferenceLine y={0} stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Portfolio"
                  name="Portfolio"
                  stroke={PORTFOLIO_COLOR}
                  strokeWidth={2.5}
                  fill="url(#portfolioFill)"
                  dot={false}
                  connectNulls
                />
                {benchmarks.map((b) => {
                  const meta = BENCHMARKS_META.find((m) => m.name === b.name);
                  if (!activeBenchmarks.includes(b.name)) return null;
                  return (
                    <Line
                      key={b.ticker}
                      type="monotone"
                      dataKey={b.name}
                      name={b.name}
                      stroke={meta?.color ?? '#888'}
                      strokeWidth={1.5}
                      strokeOpacity={0.65}
                      dot={false}
                      strokeDasharray="4 2"
                      connectNulls
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </figure>
        )}
      </div>

      <style>{`
        .page-title {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
          letter-spacing: -0.2px;
          margin-bottom: calc(var(--spacing) * 2);
        }

        .toolbar {
          display: flex;
          align-items: center;
          gap: calc(var(--spacing) * 3);
          margin-bottom: calc(var(--spacing) * 2);
          flex-wrap: wrap;
        }

        .period-selector {
          display: flex;
          gap: calc(var(--spacing) * 1);
        }

        .period-btn {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: var(--text-sm);
          font-family: var(--font-family);
          padding: 6px 14px;
          min-height: 32px;
          cursor: pointer;
          transition: color 0.15s;
        }

        .period-btn:hover { color: var(--text-primary); }

        .period-btn--active {
          background: var(--accent-blue);
          color: #fff;
          border-color: var(--accent-blue);
        }

        .benchmark-selector {
          display: flex;
          gap: calc(var(--spacing) * 1);
          margin-left: auto;
          flex-wrap: wrap;
        }

        .benchmark-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: var(--border-card);
          border-radius: var(--radius);
          color: var(--text-muted);
          font-size: var(--text-sm);
          font-family: var(--font-family);
          padding: 6px 12px;
          min-height: 32px;
          cursor: pointer;
          transition: color 0.15s, border-color 0.15s, background 0.15s;
        }

        .benchmark-btn:hover {
          color: var(--text-primary);
          border-color: var(--border-subtle);
        }

        .benchmark-btn--active {
          color: var(--text-primary);
          border-color: var(--bm-color, var(--accent-blue));
          background: color-mix(in srgb, var(--bm-color, var(--accent-blue)) 8%, transparent);
        }

        .benchmark-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .loading-text {
          color: var(--text-muted);
          font-size: var(--text-base);
        }

        .perf-tooltip {
          background: var(--bg-tooltip);
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 160px;
        }

        .perf-tooltip-date {
          color: var(--text-muted);
          font-size: var(--text-xs);
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
          font-size: var(--text-sm);
          flex: 1;
        }

        .perf-tooltip-value {
          font-size: var(--text-sm);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 600px) {
          .period-btn,
          .benchmark-btn {
            min-height: 44px;
            padding: 10px 14px;
          }

          .benchmark-selector {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

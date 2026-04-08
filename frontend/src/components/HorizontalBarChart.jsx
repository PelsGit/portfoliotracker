import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatPercent } from '../utils/format';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, weight } = payload[0].payload;
  return (
    <div className="hbar-tooltip">
      <span className="hbar-tooltip-name">{name}</span>
      <span className="hbar-tooltip-value">{formatCurrency(value)}</span>
      <span className="hbar-tooltip-weight">{formatPercent(weight)}</span>
    </div>
  );
}

export default function HorizontalBarChart({ data, compact = false }) {
  if (!data?.length) {
    return <p className="hbar-empty">No data available</p>;
  }

  const height = compact ? Math.max(data.length * 32, 120) : Math.max(data.length * 40, 160);

  return (
    <div className="hbar-chart" style={{ minHeight: height }}>
      <ResponsiveContainer width="99%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={compact ? 80 : 100}
            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="value" fill="#6c8cff" radius={[0, 4, 4, 0]} barSize={compact ? 14 : 20} />
        </BarChart>
      </ResponsiveContainer>

      <style>{`
        .hbar-chart {
          width: 100%;
        }

        .hbar-empty {
          color: var(--text-muted);
          font-size: 13px;
          padding: calc(var(--spacing) * 4) 0;
          text-align: center;
        }

        .hbar-tooltip {
          background: #1e2533;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .hbar-tooltip-name {
          color: var(--text-secondary);
          font-size: 11px;
        }

        .hbar-tooltip-value {
          color: #fff;
          font-size: 13px;
          font-weight: 500;
        }

        .hbar-tooltip-weight {
          color: var(--text-muted);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

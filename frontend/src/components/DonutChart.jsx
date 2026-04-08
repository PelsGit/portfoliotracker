import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, formatPercent } from '../utils/format';

const COLORS = [
  '#6c8cff', '#34d399', '#f87171', '#fbbf24', '#a78bfa',
  '#f472b6', '#38bdf8', '#fb923c', '#4ade80', '#e879f9',
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, weight } = payload[0].payload;
  return (
    <div className="donut-tooltip">
      <span className="donut-tooltip-name">{name}</span>
      <span className="donut-tooltip-value">{formatCurrency(value)}</span>
      <span className="donut-tooltip-weight">{formatPercent(weight)}</span>
    </div>
  );
}

function renderLegend({ payload }) {
  return (
    <ul className="donut-legend">
      {payload.map((entry, i) => (
        <li key={i} className="donut-legend-item">
          <span className="donut-legend-dot" style={{ background: entry.color }} />
          <span className="donut-legend-label">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default function DonutChart({ data, size = 'large' }) {
  if (!data?.length) {
    return <p className="donut-empty">No data available</p>;
  }

  const outerRadius = size === 'large' ? 120 : 80;
  const innerRadius = size === 'large' ? 70 : 45;
  const height = size === 'large' ? 300 : 220;

  return (
    <div className="donut-chart">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={1}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>

      <style>{`
        .donut-chart {
          width: 100%;
        }

        .donut-empty {
          color: var(--text-muted);
          font-size: 13px;
          padding: calc(var(--spacing) * 4) 0;
          text-align: center;
        }

        .donut-tooltip {
          background: #1e2533;
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .donut-tooltip-name {
          color: var(--text-secondary);
          font-size: 11px;
        }

        .donut-tooltip-value {
          color: #fff;
          font-size: 13px;
          font-weight: 500;
        }

        .donut-tooltip-weight {
          color: var(--text-muted);
          font-size: 11px;
        }

        .donut-legend {
          list-style: none;
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          justify-content: center;
          padding: 0;
          margin: 0;
        }

        .donut-legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .donut-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

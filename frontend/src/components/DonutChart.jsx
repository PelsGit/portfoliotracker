import { Cell, Pie, PieChart, Tooltip } from 'recharts';
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

export default function DonutChart({ data, size = 'large' }) {
  if (!data?.length) {
    return <p className="donut-empty">No data available</p>;
  }

  const outerRadius = size === 'large' ? 110 : 70;
  const innerRadius = size === 'large' ? 62 : 38;
  const chartSize = size === 'large' ? 260 : 180;

  return (
    <div className="donut-wrap">
      <div className="donut-chart-area">
        <PieChart width={chartSize} height={chartSize}>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx={chartSize / 2}
            cy={chartSize / 2}
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
        </PieChart>
      </div>

      <ul className="donut-legend">
        {data.map((entry, i) => (
          <li key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="donut-legend-label">{entry.name}</span>
            <span className="donut-legend-weight">{formatPercent(entry.weight)}</span>
          </li>
        ))}
      </ul>

      <style>{`
        .donut-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: calc(var(--spacing) * 2);
        }

        .donut-chart-area {
          flex-shrink: 0;
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
          flex-direction: column;
          gap: 6px;
          width: 100%;
          padding: 0;
          margin: 0;
        }

        .donut-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
        }

        .donut-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .donut-legend-label {
          color: var(--text-secondary);
          flex: 1;
        }

        .donut-legend-weight {
          color: var(--text-muted);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, formatPercent } from '../utils/format';
import { CHART_COLORS as COLORS } from '../styles/tokens';

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

  const maxWidth = size === 'large' ? 280 : 200;
  const outerPct = '42%';
  const innerPct = size === 'large' ? '24%' : '21%';

  return (
    <div className="donut-wrap">
      <div className="donut-chart-area" style={{ maxWidth }}>
        <ResponsiveContainer width="100%" aspect={1}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerPct}
              outerRadius={outerPct}
              paddingAngle={1}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
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
          width: 100%;
          flex-shrink: 0;
        }

        .donut-empty {
          color: var(--text-muted);
          font-size: 13px;
          padding: calc(var(--spacing) * 4) 0;
          text-align: center;
        }

        .donut-tooltip {
          background: var(--bg-tooltip);
          border: var(--border-card);
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
          color: var(--text-primary);
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

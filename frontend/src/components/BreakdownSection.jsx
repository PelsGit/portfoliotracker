import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CHART_COLORS } from '../styles/tokens';
import { formatCurrency, formatPercent } from '../utils/format';

const TABS = [
  { key: 'sector', label: 'Sector' },
  { key: 'industry', label: 'Industry' },
  { key: 'market_cap', label: 'Market cap' },
  { key: 'region', label: 'Continent' },
  { key: 'exchange', label: 'Exchange' },
  { key: 'broker', label: 'Broker' },
];

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value, weight } = payload[0].payload;
  return (
    <div className="bs-tooltip">
      <span className="bs-tooltip-name">{name}</span>
      <span className="bs-tooltip-value">{formatCurrency(value)}</span>
      <span className="bs-tooltip-weight">{formatPercent(weight)}</span>
    </div>
  );
}

function Legend({ data }) {
  if (!data?.length) {
    return <p className="bs-empty">No data available</p>;
  }
  return (
    <ul className="bs-legend">
      {data.map((entry, i) => (
        <li key={i} className="bs-legend-item">
          <span className="bs-legend-color" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
          <div className="bs-legend-body">
            <div className="bs-legend-row">
              <span className="bs-legend-name">{entry.name}</span>
              <span className="bs-legend-pct">{formatPercent(entry.weight)}</span>
            </div>
            <div className="bs-legend-bar-track">
              <div
                className="bs-legend-bar"
                style={{
                  width: `${Math.min(entry.weight, 100)}%`,
                  background: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function BreakdownSection({ breakdown }) {
  const [activeTab, setActiveTab] = useState('sector');

  const data = breakdown?.[activeTab] ?? [];

  return (
    <div className="bs-card">
      <nav className="bs-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`bs-tab${activeTab === tab.key ? ' bs-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="bs-body">
        <div className="bs-chart-area">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" aspect={1}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="46%"
                  outerRadius="68%"
                  paddingAngle={1}
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="bs-empty">No data available</p>
          )}
        </div>

        <div className="bs-legend-area">
          <Legend data={data} />
        </div>
      </div>

      <style>{`
        .bs-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          overflow: hidden;
          margin-bottom: calc(var(--spacing) * 3);
        }

        .bs-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--border-row);
          padding: 0 calc(var(--spacing) * 2);
          overflow-x: auto;
          scrollbar-width: none;
        }

        .bs-tabs::-webkit-scrollbar {
          display: none;
        }

        .bs-tab {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 1.5);
          white-space: nowrap;
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
        }

        .bs-tab:hover {
          color: var(--text-secondary);
        }

        .bs-tab--active {
          color: var(--text-primary);
          border-bottom-color: var(--accent-blue);
        }

        .bs-body {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: calc(var(--spacing) * 4);
          padding: calc(var(--spacing) * 3);
          align-items: start;
        }

        @media (max-width: 640px) {
          .bs-body {
            grid-template-columns: 1fr;
          }

          .bs-chart-area {
            max-width: 240px;
            margin: 0 auto;
          }
        }

        .bs-chart-area {
          width: 100%;
        }

        .bs-legend-area {
          padding-top: calc(var(--spacing) * 1);
        }

        .bs-empty {
          color: var(--text-muted);
          font-size: 13px;
          text-align: center;
          padding: calc(var(--spacing) * 4) 0;
        }

        .bs-legend {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: calc(var(--spacing) * 1.5);
        }

        .bs-legend-item {
          display: flex;
          align-items: flex-start;
          gap: calc(var(--spacing) * 1.5);
        }

        .bs-legend-color {
          width: 10px;
          height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
          margin-top: 3px;
        }

        .bs-legend-body {
          flex: 1;
          min-width: 0;
        }

        .bs-legend-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: calc(var(--spacing) * 1);
          margin-bottom: 4px;
        }

        .bs-legend-name {
          font-size: 13px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .bs-legend-pct {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }

        .bs-legend-bar-track {
          height: 2px;
          background: var(--border-row);
          border-radius: 1px;
          overflow: hidden;
        }

        .bs-legend-bar {
          height: 100%;
          border-radius: 1px;
          transition: width 0.3s ease;
        }

        .bs-tooltip {
          background: var(--bg-tooltip);
          border: var(--border-card);
          border-radius: 6px;
          padding: 8px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .bs-tooltip-name {
          color: var(--text-secondary);
          font-size: 11px;
        }

        .bs-tooltip-value {
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
        }

        .bs-tooltip-weight {
          color: var(--text-muted);
          font-size: 11px;
        }
      `}</style>
    </div>
  );
}

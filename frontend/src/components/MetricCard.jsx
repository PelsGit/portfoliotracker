export default function MetricCard({ label, value, delta, deltaType }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {delta && (
        <span className={`metric-delta metric-delta--${deltaType || 'neutral'}`}>
          {delta}
        </span>
      )}

      <style>{`
        .metric-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 2.5);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .metric-label {
          font-size: var(--text-xs);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-muted);
        }

        .metric-value {
          font-size: var(--text-xl);
          font-weight: 600;
          line-height: 1.2;
          color: var(--text-primary);
          font-variant-numeric: tabular-nums;
        }

        .metric-delta {
          font-size: var(--text-base);
          font-variant-numeric: tabular-nums;
        }

        .metric-delta--positive {
          color: var(--positive);
        }

        .metric-delta--negative {
          color: var(--negative);
        }

        .metric-delta--neutral {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
}

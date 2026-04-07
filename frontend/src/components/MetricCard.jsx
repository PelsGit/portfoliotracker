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
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
        }

        .metric-value {
          font-size: 20px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .metric-delta {
          font-size: 13px;
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

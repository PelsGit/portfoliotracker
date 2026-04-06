import { useNavigate } from 'react-router-dom';

export default function Overview() {
  const navigate = useNavigate();

  return (
    <div>
      <h1 className="page-title">Portfolio Overview</h1>
      <div className="empty-state">
        <p>Import your DEGIRO transactions to see your portfolio breakdown.</p>
        <button className="btn-primary" onClick={() => navigate('/import')}>
          Import CSV
        </button>
      </div>

      <style>{`
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .empty-state {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 6);
          text-align: center;
          color: var(--text-secondary);
        }

        .empty-state p {
          margin-bottom: calc(var(--spacing) * 2);
        }

        .btn-primary {
          background: var(--accent-blue);
          color: #fff;
          border: none;
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 1.5) calc(var(--spacing) * 3);
          font-size: 13px;
          cursor: pointer;
        }

        .btn-primary:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
}

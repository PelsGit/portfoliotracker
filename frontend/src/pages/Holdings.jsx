import { useEffect, useState } from 'react';
import api from '../api/client';
import HoldingsTable from '../components/HoldingsTable';

export default function Holdings() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/portfolio/holdings')
      .then((res) => setHoldings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">Holdings</h1>

      {loading ? (
        <p className="loading-text">Loading...</p>
      ) : !holdings.length ? (
        <div className="empty-state">
          <p>No holdings yet. Import transactions to see your positions.</p>
        </div>
      ) : (
        <HoldingsTable holdings={holdings} />
      )}

      <style>{`
        .page-title {
          font-size: 17px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .loading-text {
          color: var(--text-muted);
          font-size: 13px;
        }

        .empty-state {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 6);
          text-align: center;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}

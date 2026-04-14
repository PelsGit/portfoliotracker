import { useState } from 'react';
import HoldingsTable from '../components/HoldingsTable';
import Dividends from './Dividends';
import { useEffect } from 'react';
import api from '../api/client';

export default function Holdings() {
  const [activeTab, setActiveTab] = useState('holdings');
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
      {/* Tab bar */}
      <div className="tab-bar">
        <button
          className={`tab-btn${activeTab === 'holdings' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('holdings')}
        >
          Holdings
        </button>
        <button
          className={`tab-btn${activeTab === 'dividends' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('dividends')}
        >
          Dividends
        </button>
      </div>

      {/* Holdings tab */}
      {activeTab === 'holdings' && (
        <>
          {loading ? (
            <p className="loading-text">Loading...</p>
          ) : !holdings.length ? (
            <div className="empty-state">
              <p>No holdings yet. Import transactions to see your positions.</p>
            </div>
          ) : (
            <HoldingsTable holdings={holdings} />
          )}
        </>
      )}

      {/* Dividends tab */}
      {activeTab === 'dividends' && <Dividends standalone={false} />}

      <style>{`
        .tab-bar {
          display: flex;
          gap: 2px;
          margin-bottom: calc(var(--spacing) * 3);
        }

        .tab-btn {
          background: none;
          border: none;
          padding: 4px 0;
          margin-right: calc(var(--spacing) * 2);
          font-size: 17px;
          font-weight: 500;
          color: var(--text-muted);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          line-height: 1.4;
        }

        .tab-btn--active {
          color: var(--text-primary);
          border-bottom-color: var(--accent-blue, #6c8cff);
        }

        .tab-btn:hover:not(.tab-btn--active) {
          color: var(--text-secondary);
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

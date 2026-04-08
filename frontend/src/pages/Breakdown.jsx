import { useEffect, useState } from 'react';
import api from '../api/client';
import BreakdownTable from '../components/BreakdownTable';
import DonutChart from '../components/DonutChart';
import HorizontalBarChart from '../components/HorizontalBarChart';

export default function Breakdown() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/api/portfolio/breakdown')
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Breakdown</h1>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  const isEmpty = !data?.sector?.length && !data?.region?.length && !data?.asset_type?.length;

  if (isEmpty) {
    return (
      <div>
        <h1 className="page-title">Breakdown</h1>
        <p className="loading-text">No breakdown data available. Import transactions first.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Breakdown</h1>

      <section className="breakdown-section">
        <h2 className="section-title">Sector Allocation</h2>
        <div className="breakdown-row">
          <div className="breakdown-chart-card">
            <DonutChart data={data.sector} size="large" />
          </div>
          <div className="breakdown-chart-card">
            <BreakdownTable data={data.sector} />
          </div>
        </div>
      </section>

      <section className="breakdown-section">
        <h2 className="section-title">Region Allocation</h2>
        <div className="breakdown-row">
          <div className="breakdown-chart-card">
            <DonutChart data={data.region} size="large" />
          </div>
          <div className="breakdown-chart-card">
            <BreakdownTable data={data.region} />
          </div>
        </div>
      </section>

      <section className="breakdown-section">
        <h2 className="section-title">Asset Type</h2>
        <div className="breakdown-row">
          <div className="breakdown-chart-card">
            <HorizontalBarChart data={data.asset_type} />
          </div>
          <div className="breakdown-chart-card">
            <BreakdownTable data={data.asset_type} />
          </div>
        </div>
      </section>

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

        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          font-weight: 400;
          margin-bottom: calc(var(--spacing) * 1.5);
        }

        .breakdown-section {
          margin-bottom: calc(var(--spacing) * 4);
        }

        .breakdown-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: calc(var(--spacing) * 2);
        }

        .breakdown-chart-card {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 3);
        }
      `}</style>
    </div>
  );
}

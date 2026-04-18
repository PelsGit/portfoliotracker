import { useEffect, useState } from 'react';
import api from '../api/client';
import BreakdownTable from '../components/BreakdownTable';
import DonutChart from '../components/DonutChart';
import HorizontalBarChart from '../components/HorizontalBarChart';

const DIMENSIONS = [
  { key: 'sector', label: 'Sector' },
  { key: 'region', label: 'Region' },
  { key: 'asset_type', label: 'Asset Type' },
];

// ─── GoalsTab ────────────────────────────────────────────────────────────────

function GapBar({ actual, target }) {
  const delta = target != null ? actual - target : null;
  const onTarget = delta != null && Math.abs(delta) <= 2;
  const over = delta != null && delta > 2;

  return (
    <div className="gap-row">
      <div className="gap-bars">
        <div className="gap-bar-pair">
          <div className="gap-bar-track">
            <div className="gap-bar gap-bar--actual" style={{ width: `${Math.min(actual, 100)}%` }} />
          </div>
          <span className="gap-pct">{actual.toFixed(1)}%</span>
        </div>
        <div className="gap-bar-pair">
          {target != null ? (
            <>
              <div className="gap-bar-track">
                <div className="gap-bar gap-bar--target" style={{ width: `${Math.min(target, 100)}%` }} />
              </div>
              <span className="gap-pct gap-pct--muted">{target.toFixed(1)}%</span>
              <span className={`gap-delta ${onTarget ? 'gap-delta--ok' : over ? 'gap-delta--over' : 'gap-delta--under'}`}>
                {onTarget ? '✓' : over ? `▲ +${delta.toFixed(1)}%` : `▼ ${delta.toFixed(1)}%`}
              </span>
            </>
          ) : (
            <span className="gap-no-target">— no target</span>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalsSection({ dimKey, label, breakdown, goals, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const goalMap = Object.fromEntries((goals || []).map((g) => [g.name, g.target_weight]));
  const categories = breakdown || [];

  function startEdit() {
    const initial = {};
    categories.forEach((c) => {
      initial[c.name] = goalMap[c.name] != null ? String(goalMap[c.name]) : '';
    });
    setDraft(initial);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setDraft({});
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const payload = Object.entries(draft)
        .filter(([, v]) => v !== '' && !isNaN(Number(v)))
        .map(([name, v]) => ({ name, target_weight: Number(v) }));
      await onSave(dimKey, payload);
      setEditing(false);
      setDraft({});
    } finally {
      setSaving(false);
    }
  }

  const totalDraft = Object.values(draft)
    .filter((v) => v !== '' && !isNaN(Number(v)))
    .reduce((s, v) => s + Number(v), 0);

  if (!categories.length) {
    return (
      <section className="goals-section">
        <div className="goals-section-header">
          <h2 className="section-title">{label}</h2>
        </div>
        <p className="loading-text">No holdings in this dimension yet.</p>
      </section>
    );
  }

  return (
    <section className="goals-section">
      <div className="goals-section-header">
        <h2 className="section-title">{label}</h2>
        {!editing && (
          <button className="edit-btn" onClick={startEdit}>Edit targets</button>
        )}
      </div>

      {/* Column headers */}
      <div className="gap-table">
        <div className="gap-header">
          <span className="gap-name" />
          <div className="gap-bars">
            <span className="gap-col-label">Current</span>
            <span className="gap-col-label">Target</span>
          </div>
        </div>

        {categories.map((cat) => (
          <div key={cat.name} className="gap-table-row">
            <span className="gap-name">{cat.name}</span>
            {editing ? (
              <div className="gap-bars">
                <div className="gap-bar-pair">
                  <div className="gap-bar-track">
                    <div className="gap-bar gap-bar--actual" style={{ width: `${Math.min(cat.weight, 100)}%` }} />
                  </div>
                  <span className="gap-pct">{cat.weight.toFixed(1)}%</span>
                </div>
                <div className="gap-bar-pair gap-bar-pair--edit">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="target-input"
                    placeholder="0"
                    value={draft[cat.name] ?? ''}
                    onChange={(e) => setDraft((d) => ({ ...d, [cat.name]: e.target.value }))}
                  />
                  <span className="gap-pct gap-pct--muted">%</span>
                </div>
              </div>
            ) : (
              <GapBar actual={cat.weight} target={goalMap[cat.name] ?? null} />
            )}
          </div>
        ))}
      </div>

      {editing && (
        <div className="edit-footer">
          <span className={`total-indicator ${totalDraft > 100 ? 'total-indicator--over' : ''}`}>
            Total: {totalDraft.toFixed(1)}% {totalDraft > 100 && '(exceeds 100%)'}
          </span>
          <div className="edit-actions">
            <button className="edit-btn edit-btn--cancel" onClick={cancelEdit}>Cancel</button>
            <button className="edit-btn edit-btn--save" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function GoalsTab({ breakdown }) {
  const [goals, setGoals] = useState({ sector: [], region: [], asset_type: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/portfolio/goals')
      .then((res) => setGoals(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(dimension, payload) {
    const res = await api.put(`/api/portfolio/goals/${dimension}`, payload);
    setGoals((prev) => ({ ...prev, [dimension]: res.data }));
  }

  if (loading) return <p className="loading-text">Loading goals…</p>;

  return (
    <div className="goals-tab">
      {DIMENSIONS.map(({ key, label }) => (
        <GoalsSection
          key={key}
          dimKey={key}
          label={label}
          breakdown={breakdown?.[key]}
          goals={goals[key]}
          onSave={handleSave}
        />
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Breakdown() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('allocation');

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

  return (
    <div>
      <h1 className="page-title">Breakdown</h1>

      <div className="tab-bar">
        <button
          className={`tab-btn${activeTab === 'allocation' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('allocation')}
        >
          Allocation
        </button>
        <button
          className={`tab-btn${activeTab === 'goals' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
        </button>
      </div>

      {activeTab === 'allocation' && (
        <>
          {isEmpty ? (
            <p className="loading-text">No breakdown data available. Import transactions first.</p>
          ) : (
            <>
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
            </>
          )}
        </>
      )}

      {activeTab === 'goals' && <GoalsTab breakdown={data} />}

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

        /* ── Goals tab ── */
        .goals-tab {
          display: flex;
          flex-direction: column;
          gap: calc(var(--spacing) * 4);
        }

        .goals-section {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 3);
        }

        .goals-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: calc(var(--spacing) * 2);
        }

        .goals-section-header .section-title {
          margin-bottom: 0;
        }

        /* Gap table */
        .gap-table {
          display: flex;
          flex-direction: column;
          gap: calc(var(--spacing) * 1);
        }

        .gap-header, .gap-table-row {
          display: grid;
          grid-template-columns: 160px 1fr;
          align-items: center;
          gap: calc(var(--spacing) * 2);
        }

        .gap-header {
          margin-bottom: calc(var(--spacing) * 0.5);
        }

        .gap-col-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--text-muted);
          flex: 1;
        }

        .gap-name {
          font-size: 13px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .gap-bars {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: calc(var(--spacing) * 2);
        }

        .gap-bar-pair {
          display: flex;
          align-items: center;
          gap: calc(var(--spacing) * 1);
        }

        .gap-bar-pair--edit {
          gap: 6px;
        }

        .gap-bar-track {
          flex: 1;
          height: 8px;
          background: var(--bg-hover, rgba(255,255,255,0.05));
          border-radius: 4px;
          overflow: hidden;
        }

        .gap-bar {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .gap-bar--actual {
          background: var(--color-accent, #4f8ef7);
        }

        .gap-bar--target {
          background: rgba(160, 160, 160, 0.5);
          border: 1px dashed rgba(160, 160, 160, 0.8);
          box-sizing: border-box;
        }

        .gap-pct {
          font-size: 12px;
          color: var(--text-primary);
          white-space: nowrap;
          min-width: 38px;
        }

        .gap-pct--muted {
          color: var(--text-muted);
        }

        .gap-delta {
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .gap-delta--ok    { color: #4ade80; background: rgba(74,222,128,0.1); }
        .gap-delta--over  { color: #f87171; background: rgba(248,113,113,0.1); }
        .gap-delta--under { color: #60a5fa; background: rgba(96,165,250,0.1); }

        .gap-no-target {
          font-size: 12px;
          color: var(--text-muted);
          font-style: italic;
        }

        /* Target input */
        .target-input {
          width: 64px;
          padding: 3px 6px;
          font-size: 12px;
          background: var(--bg-input, rgba(255,255,255,0.08));
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.12));
          border-radius: 4px;
          color: var(--text-primary);
          text-align: right;
        }

        .target-input:focus {
          outline: none;
          border-color: var(--color-accent, #4f8ef7);
        }

        /* Edit footer */
        .edit-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: calc(var(--spacing) * 2);
          padding-top: calc(var(--spacing) * 2);
          border-top: var(--border-card);
        }

        .total-indicator {
          font-size: 12px;
          color: var(--text-muted);
        }

        .total-indicator--over {
          color: #f87171;
        }

        .edit-actions {
          display: flex;
          gap: calc(var(--spacing) * 1);
        }

        /* Edit button */
        .edit-btn {
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.15));
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .edit-btn:hover {
          border-color: var(--color-accent, #4f8ef7);
          color: var(--color-accent, #4f8ef7);
        }

        .edit-btn--save {
          background: var(--color-accent, #4f8ef7);
          border-color: var(--color-accent, #4f8ef7);
          color: white;
        }

        .edit-btn--save:hover {
          opacity: 0.85;
          color: white;
        }

        .edit-btn--save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-btn--cancel:hover {
          border-color: var(--text-muted);
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

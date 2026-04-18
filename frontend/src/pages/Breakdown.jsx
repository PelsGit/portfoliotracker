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
            <div
              className="gap-bar gap-bar--actual"
              role="progressbar"
              aria-valuenow={actual}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ transform: `scaleX(${Math.min(actual, 100) / 100})` }}
            />
          </div>
          <span className="gap-pct">{actual.toFixed(1)}%</span>
        </div>
        <div className="gap-bar-pair">
          {target != null ? (
            <>
              <div className="gap-bar-track">
                <div
                  className="gap-bar gap-bar--target"
                  role="progressbar"
                  aria-valuenow={target}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{ transform: `scaleX(${Math.min(target, 100) / 100})` }}
                />
              </div>
              <span className="gap-pct gap-pct--muted">{target.toFixed(1)}%</span>
              <span className={`gap-delta ${onTarget ? 'gap-delta--ok' : over ? 'gap-delta--over' : 'gap-delta--under'}`}>
                {onTarget
                  ? <><span aria-hidden="true">✓</span><span className="sr-only"> on target</span></>
                  : over
                  ? <><span aria-hidden="true">▲</span>{` +${delta.toFixed(1)}%`}</>
                  : <><span aria-hidden="true">▼</span>{` ${delta.toFixed(1)}%`}</>
                }
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
                    <div
                      className="gap-bar gap-bar--actual"
                      style={{ transform: `scaleX(${Math.min(cat.weight, 100) / 100})` }}
                    />
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
                    aria-label={`Target weight for ${cat.name}`}
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

  if (loading) {
    return <p className="loading-text" role="status" aria-live="polite">Loading goals…</p>;
  }

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
        <p className="loading-text" role="status" aria-live="polite">Loading...</p>
      </div>
    );
  }

  const isEmpty = !data?.sector?.length && !data?.region?.length && !data?.asset_type?.length;

  return (
    <div>
      <h1 className="page-title">Breakdown</h1>

      <div
        className="tab-bar"
        role="tablist"
        aria-label="Breakdown views"
        onKeyDown={(e) => {
          const tabs = ['allocation', 'goals'];
          const idx = tabs.indexOf(activeTab);
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setActiveTab(tabs[(idx + 1) % tabs.length]);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length]);
          }
        }}
      >
        <button
          role="tab"
          id="tab-allocation"
          aria-selected={activeTab === 'allocation'}
          aria-controls="panel-allocation"
          className={`tab-btn${activeTab === 'allocation' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('allocation')}
        >
          Allocation
        </button>
        <button
          role="tab"
          id="tab-goals"
          aria-selected={activeTab === 'goals'}
          aria-controls="panel-goals"
          className={`tab-btn${activeTab === 'goals' ? ' tab-btn--active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          Goals
        </button>
      </div>

      {activeTab === 'allocation' && (
        <div role="tabpanel" id="panel-allocation" aria-labelledby="tab-allocation">
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
        </div>
      )}

      {activeTab === 'goals' && (
        <div role="tabpanel" id="panel-goals" aria-labelledby="tab-goals">
          <GoalsTab breakdown={data} />
        </div>
      )}

      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        .tab-bar {
          display: flex;
          gap: 2px;
          margin-bottom: calc(var(--spacing) * 3);
        }

        .tab-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 8px 0;
          min-height: 44px;
          margin-right: calc(var(--spacing) * 2);
          font-size: var(--text-lg);
          font-weight: 500;
          font-family: var(--font-family);
          color: var(--text-muted);
          cursor: pointer;
          line-height: 1.4;
          transition: color 0.15s;
        }

        .tab-btn--active {
          color: var(--text-primary);
          border-bottom-color: var(--accent-blue);
        }

        .tab-btn:hover:not(.tab-btn--active) {
          color: var(--text-secondary);
        }

        .page-title {
          font-size: var(--text-lg);
          font-weight: 600;
          letter-spacing: -0.2px;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 3);
        }

        .loading-text {
          color: var(--text-muted);
          font-size: var(--text-base);
        }

        .section-title {
          font-size: var(--text-xs);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: var(--text-muted);
          margin-bottom: calc(var(--spacing) * 1.5);
        }

        .breakdown-section {
          margin-bottom: calc(var(--spacing) * 4);
        }

        .breakdown-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

        .gap-table {
          display: flex;
          flex-direction: column;
          gap: calc(var(--spacing) * 1);
        }

        .gap-header, .gap-table-row {
          display: grid;
          grid-template-columns: minmax(100px, 160px) 1fr;
          align-items: center;
          gap: calc(var(--spacing) * 2);
        }

        .gap-header {
          margin-bottom: calc(var(--spacing) * 0.5);
        }

        .gap-col-label {
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--text-muted);
          flex: 1;
        }

        .gap-name {
          font-size: var(--text-base);
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
          background: var(--bg-hover);
          border-radius: 4px;
          overflow: hidden;
        }

        .gap-bar {
          height: 100%;
          width: 100%;
          transform-origin: left center;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (prefers-reduced-motion: reduce) {
          .gap-bar { transition: none; }
        }

        .gap-bar--actual {
          background: var(--accent-blue);
        }

        .gap-bar--target {
          background: color-mix(in srgb, var(--text-muted) 50%, transparent);
          border: 1px dashed color-mix(in srgb, var(--text-muted) 80%, transparent);
          box-sizing: border-box;
        }

        .gap-pct {
          font-size: var(--text-sm);
          color: var(--text-primary);
          white-space: nowrap;
          min-width: 38px;
          font-variant-numeric: tabular-nums;
        }

        .gap-pct--muted {
          color: var(--text-muted);
        }

        .gap-delta {
          font-size: var(--text-xs);
          font-weight: 500;
          white-space: nowrap;
          padding: 1px 5px;
          border-radius: 4px;
          font-variant-numeric: tabular-nums;
        }

        .gap-delta--ok    { color: var(--positive);    background: color-mix(in srgb, var(--positive)    10%, transparent); }
        .gap-delta--over  { color: var(--negative);    background: color-mix(in srgb, var(--negative)    10%, transparent); }
        .gap-delta--under { color: var(--accent-blue); background: color-mix(in srgb, var(--accent-blue) 10%, transparent); }

        .gap-no-target {
          font-size: var(--text-sm);
          color: var(--text-muted);
          font-style: italic;
        }

        .target-input {
          width: 64px;
          min-height: 32px;
          padding: 3px 6px;
          font-size: var(--text-sm);
          font-family: var(--font-family);
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          color: var(--text-primary);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .target-input:focus {
          outline: 2px solid var(--accent-blue);
          outline-offset: 2px;
          border-color: var(--accent-blue);
        }

        .edit-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: calc(var(--spacing) * 2);
          padding-top: calc(var(--spacing) * 2);
          border-top: var(--border-card);
        }

        .total-indicator {
          font-size: var(--text-sm);
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }

        .total-indicator--over {
          color: var(--negative);
        }

        .edit-actions {
          display: flex;
          gap: calc(var(--spacing) * 1);
        }

        .edit-btn {
          font-size: var(--text-sm);
          font-family: var(--font-family);
          padding: 6px 12px;
          min-height: 32px;
          border-radius: 6px;
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: border-color 0.15s, color 0.15s;
        }

        .edit-btn:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
        }

        .edit-btn--save {
          background: var(--accent-blue);
          border-color: var(--accent-blue);
          color: var(--text-primary);
        }

        .edit-btn--save:hover {
          opacity: 0.85;
        }

        .edit-btn--save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .edit-btn--cancel:hover {
          border-color: var(--text-muted);
          color: var(--text-primary);
        }

        @media (max-width: 600px) {
          .tab-btn {
            font-size: var(--text-base);
          }

          .gap-header, .gap-table-row {
            grid-template-columns: minmax(80px, 120px) 1fr;
          }

          .edit-btn {
            min-height: 44px;
            padding: 10px 16px;
          }

          .target-input {
            min-height: 44px;
          }
        }
      `}</style>
    </div>
  );
}

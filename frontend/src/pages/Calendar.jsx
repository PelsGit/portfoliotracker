import { useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // Monday = 0
  const d = new Date(year, month, 1).getDay();
  return (d + 6) % 7;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// No semantic colors (#34d399 = --positive, #f87171 = --negative excluded)
const PALETTE = [
  '#6c8cff', '#fb923c', '#c084fc', '#38bdf8',
  '#f472b6', '#facc15', '#a78bfa', '#2dd4bf',
  '#94a3b8', '#e879f9',
];

function CompanyIcon({ logoUrl, color, size }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        style={{ borderRadius: 3, objectFit: 'contain', flexShrink: 0 }}
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
        display: 'inline-block',
      }}
    />
  );
}

function isinColor(isin, colorMap) {
  if (!colorMap[isin]) {
    const idx = Object.keys(colorMap).length % PALETTE.length;
    colorMap[isin] = PALETTE[idx];
  }
  return colorMap[isin];
}

export default function Calendar() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const today = new Date(todayStr);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stable color assignments across renders (useRef survives StrictMode double-invoke)
  const colorMapRef = useRef({});
  const colorMap = colorMapRef.current;

  useEffect(() => {
    api
      .get('/api/portfolio/earnings')
      .then((res) => setEarnings(res.data))
      .catch(() => setEarnings([]))
      .finally(() => setLoading(false));
  }, []);

  const byDate = useMemo(() => {
    const map = {};
    for (const e of earnings) {
      map[e.earnings_date] = map[e.earnings_date] || [];
      map[e.earnings_date].push(e);
    }
    return map;
  }, [earnings]);

  const upcoming = useMemo(
    () =>
      earnings
        .filter((e) => e.earnings_date >= todayStr)
        .sort((a, b) => a.earnings_date.localeCompare(b.earnings_date))
        .slice(0, 20),
    [earnings, todayStr]
  );

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEvents = useMemo(
    () => earnings.filter((e) => e.earnings_date.startsWith(monthPrefix)),
    [earnings, monthPrefix]
  );

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  return (
    <div>
      <h1 className="page-title">Earnings Calendar</h1>

      <div className="cal-layout">
        <div className="cal-main">
          <div className="cal-header">
            <button
              className="cal-nav-btn"
              onClick={prevMonth}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="cal-month-label" aria-live="polite" aria-atomic="true">
              {MONTH_NAMES[month]} {year}
            </span>
            <button
              className="cal-nav-btn"
              onClick={nextMonth}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div
            className="cal-grid"
            role="grid"
            aria-label={`${MONTH_NAMES[month]} ${year}`}
          >
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-weekday" role="columnheader" aria-label={d}>
                {d}
              </div>
            ))}

            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="cal-cell cal-cell--empty" role="gridcell" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = byDate[dateStr] || [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={day}
                  role="gridcell"
                  aria-current={isToday ? 'date' : undefined}
                  className={`cal-cell${isToday ? ' cal-cell--today' : ''}${events.length ? ' cal-cell--has-event' : ''}`}
                >
                  <span className={`cal-day-num${isToday ? ' cal-day-num--today' : ''}`}>
                    {day}
                  </span>
                  {events.map((e) => {
                    const color = isinColor(e.isin, colorMap);
                    return (
                      <span
                        key={e.isin}
                        className="cal-event"
                        style={{ '--event-color': color }}
                        title={e.product_name}
                        aria-label={e.product_name}
                      >
                        <CompanyIcon logoUrl={e.logo_url} name={e.product_name} color={color} size={12} />
                        <span className="cal-event-name">{e.product_name}</span>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="cal-sidebar">
          <h2 className="cal-sidebar-title">Upcoming earnings</h2>
          {loading ? (
            <p role="status" aria-live="polite" className="cal-empty">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="cal-empty">No upcoming earnings found.</p>
          ) : (
            upcoming.map((e) => {
              const d = new Date(e.earnings_date + 'T00:00:00');
              const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const isPast = e.earnings_date < todayStr;
              const color = isinColor(e.isin, colorMap);
              return (
                <div
                  key={`${e.isin}-${e.earnings_date}`}
                  className={`cal-upcoming-row${isPast ? ' cal-upcoming-row--past' : ''}`}
                >
                  <CompanyIcon logoUrl={e.logo_url} name={e.product_name} color={color} size={16} />
                  <span className="cal-upcoming-name">{e.product_name}</span>
                  <span className="cal-upcoming-date">{label}</span>
                </div>
              );
            })
          )}

          {monthEvents.length > 0 && (
            <div className="cal-month-summary">
              {monthEvents.length} event{monthEvents.length > 1 ? 's' : ''} this month
            </div>
          )}
        </div>
      </div>

      <style>{`
        .page-title {
          font-size: var(--text-lg);
          font-weight: 600;
          letter-spacing: -0.2px;
          color: var(--text-primary);
          margin-bottom: calc(var(--spacing) * 2);
        }

        .cal-layout {
          display: grid;
          grid-template-columns: 1fr 220px;
          gap: calc(var(--spacing) * 3);
          align-items: start;
        }

        .cal-main {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 3);
        }

        .cal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: calc(var(--spacing) * 2);
        }

        .cal-nav-btn {
          background: none;
          border: var(--border-card);
          border-radius: var(--radius);
          color: var(--text-secondary);
          font-size: 18px;
          width: 32px;
          height: 32px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          transition: color 0.15s;
        }

        .cal-nav-btn:hover { color: var(--text-primary); }

        .cal-month-label {
          font-size: var(--text-lg);
          font-weight: 600;
          color: var(--text-primary);
        }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }

        .cal-weekday {
          text-align: center;
          font-size: var(--text-xs);
          color: var(--text-muted);
          padding: 4px 0 8px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .cal-cell {
          min-height: 80px;
          border-radius: 4px;
          padding: 4px 5px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(255, 255, 255, 0.02);
        }

        .cal-cell--empty { background: transparent; }

        .cal-cell--today {
          background: color-mix(in srgb, var(--accent-blue) 6%, transparent);
          outline: 1px solid color-mix(in srgb, var(--accent-blue) 30%, transparent);
        }

        .cal-day-num {
          font-size: var(--text-sm);
          color: var(--text-muted);
          margin-bottom: 2px;
          align-self: flex-end;
          font-variant-numeric: tabular-nums;
        }

        .cal-day-num--today {
          color: var(--accent-blue);
          font-weight: 600;
        }

        .cal-event {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: var(--text-xs);
          padding: 2px 5px;
          border-radius: 3px;
          background: color-mix(in srgb, var(--event-color, var(--accent-blue)) 12%, transparent);
          overflow: hidden;
          cursor: default;
        }

        .cal-event-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--text-primary);
        }

        .cal-sidebar {
          background: var(--bg-card);
          border: var(--border-card);
          border-radius: var(--radius);
          padding: calc(var(--spacing) * 2);
          display: flex;
          flex-direction: column;
          gap: calc(var(--spacing) * 0.5);
        }

        .cal-sidebar-title {
          font-size: var(--text-xs);
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: calc(var(--spacing) * 0.5);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .cal-empty {
          font-size: var(--text-sm);
          color: var(--text-muted);
        }

        .cal-upcoming-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 0;
          border-bottom: 1px solid var(--border-row);
        }

        .cal-upcoming-row--past { opacity: 0.55; }

        .cal-upcoming-name {
          font-size: var(--text-sm);
          color: var(--text-primary);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cal-upcoming-date {
          font-size: var(--text-xs);
          color: var(--text-muted);
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }

        .cal-month-summary {
          margin-top: calc(var(--spacing) * 1.5);
          font-size: var(--text-xs);
          color: var(--text-muted);
          text-align: center;
        }

        @media (max-width: 640px) {
          .cal-layout {
            grid-template-columns: 1fr;
          }

          .cal-nav-btn {
            width: 44px;
            height: 44px;
            font-size: 22px;
          }

          .cal-cell {
            min-height: 56px;
            padding: 3px 3px;
          }

          .cal-main {
            padding: calc(var(--spacing) * 2);
          }
        }
      `}</style>
    </div>
  );
}

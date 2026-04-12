import { useEffect, useState } from 'react';
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

// Stable colour per ISIN
const PALETTE = [
  '#6c8cff', '#4ade80', '#fb923c', '#c084fc', '#38bdf8',
  '#f472b6', '#facc15', '#34d399', '#f87171', '#a78bfa',
];
function isinColor(isin, colorMap) {
  if (!colorMap[isin]) {
    const idx = Object.keys(colorMap).length % PALETTE.length;
    colorMap[isin] = PALETTE[idx];
  }
  return colorMap[isin];
}

export default function Calendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const colorMap = {};

  useEffect(() => {
    api
      .get('/api/portfolio/earnings')
      .then((res) => setEarnings(res.data))
      .catch(() => setEarnings([]))
      .finally(() => setLoading(false));
  }, []);

  // Group earnings by date string "YYYY-MM-DD"
  const byDate = {};
  for (const e of earnings) {
    byDate[e.earnings_date] = byDate[e.earnings_date] || [];
    byDate[e.earnings_date].push(e);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);
  const todayStr = today.toISOString().slice(0, 10);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  // Upcoming earnings list (next 90 days)
  const upcoming = earnings
    .filter((e) => e.earnings_date >= todayStr)
    .sort((a, b) => a.earnings_date.localeCompare(b.earnings_date))
    .slice(0, 20);

  // Count unique companies in selected month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthEvents = earnings.filter((e) => e.earnings_date.startsWith(monthPrefix));

  return (
    <div>
      <h1 className="page-title">Earnings Calendar</h1>

      <div className="cal-layout">
        <div className="cal-main">
          {/* Month navigation */}
          <div className="cal-header">
            <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
            <span className="cal-month-label">{MONTH_NAMES[month]} {year}</span>
            <button className="cal-nav-btn" onClick={nextMonth}>›</button>
          </div>

          {/* Weekday headers */}
          <div className="cal-grid">
            {WEEKDAYS.map((d) => (
              <div key={d} className="cal-weekday">{d}</div>
            ))}

            {/* Leading empty cells */}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="cal-cell cal-cell--empty" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const events = byDate[dateStr] || [];
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={day}
                  className={`cal-cell${isToday ? ' cal-cell--today' : ''}${events.length ? ' cal-cell--has-event' : ''}`}
                >
                  <span className={`cal-day-num${isToday ? ' cal-day-num--today' : ''}`}>{day}</span>
                  {events.map((e) => (
                    <span
                      key={e.isin}
                      className="cal-event"
                      style={{ background: isinColor(e.isin, colorMap) + '22', borderLeft: `3px solid ${isinColor(e.isin, colorMap)}` }}
                      title={e.product_name}
                    >
                      {e.product_name}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar: upcoming */}
        <div className="cal-sidebar">
          <div className="cal-sidebar-title">Upcoming earnings</div>
          {loading ? (
            <p className="cal-empty">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="cal-empty">No upcoming earnings found.</p>
          ) : (
            upcoming.map((e) => {
              const d = new Date(e.earnings_date + 'T00:00:00');
              const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
              const isPast = e.earnings_date < todayStr;
              return (
                <div key={`${e.isin}-${e.earnings_date}`} className={`cal-upcoming-row${isPast ? ' cal-upcoming-row--past' : ''}`}>
                  <span className="cal-upcoming-dot" style={{ background: isinColor(e.isin, colorMap) }} />
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
          font-size: 17px;
          font-weight: 500;
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
        }

        .cal-nav-btn:hover { color: var(--text-primary); }

        .cal-month-label {
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }

        .cal-weekday {
          text-align: center;
          font-size: 11px;
          color: var(--text-muted);
          padding: 4px 0 8px;
          font-weight: 500;
        }

        .cal-cell {
          min-height: 80px;
          border-radius: 4px;
          padding: 4px 5px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          background: rgba(255,255,255,0.02);
        }

        .cal-cell--empty { background: transparent; }

        .cal-cell--today {
          background: rgba(108, 140, 255, 0.06);
          outline: 1px solid rgba(108, 140, 255, 0.3);
        }

        .cal-day-num {
          font-size: 12px;
          color: var(--text-muted);
          margin-bottom: 2px;
          align-self: flex-end;
        }

        .cal-day-num--today {
          color: var(--accent-blue);
          font-weight: 600;
        }

        .cal-event {
          font-size: 10px;
          color: var(--text-primary);
          padding: 2px 4px;
          border-radius: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          cursor: default;
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
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: calc(var(--spacing) * 0.5);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .cal-empty {
          font-size: 12px;
          color: var(--text-muted);
        }

        .cal-upcoming-row {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }

        .cal-upcoming-row--past { opacity: 0.45; }

        .cal-upcoming-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .cal-upcoming-name {
          font-size: 12px;
          color: var(--text-primary);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cal-upcoming-date {
          font-size: 11px;
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .cal-month-summary {
          margin-top: calc(var(--spacing) * 1.5);
          font-size: 11px;
          color: var(--text-muted);
          text-align: center;
        }
      `}</style>
    </div>
  );
}

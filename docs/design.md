# Design System

Inspired by getquin — dark, data-dense, clean. No gradients, no decorative effects.

## Visual Language

- Dark background: `#0f1117` (page), `#161b27` (cards/sidebar)
- Card borders: `0.5px solid rgba(255,255,255,0.08)`
- Text primary: `#e2e8f0`, secondary: `#9ca3af`, muted: `#6b7280`
- Accent blue: `#6c8cff` (nav active state, primary bars, highlights)
- Positive: `#34d399` (green), Negative: `#f87171` (red)
- Base spacing unit: 8px

## Layout

Three-panel layout:
- **Sidebar** (200px fixed) — navigation + logo
- **Main content** (flex: 1) — scrollable, 20px padding, 16px gap between sections

Sidebar is dark (`#161b27`) with a subtle right border. Active nav item has a left blue accent border and slightly lighter background. Nav labels are sentence case, 13px.

## Components

**Metric cards** — 4-column grid at the top of each page. Dark background, no border highlight. Large number (20px, white), small muted label above, small colored sub-label below (green/red for deltas).

**Chart cards** — 3-column grid. Donut chart for sector allocation (SVG circles), horizontal bar chart for region breakdown, mini holdings list for top positions.

**Holdings table** — full-width card at bottom of overview. Columns: Ticker (bold white), Name (muted), Value (white), Return (badge — green/red pill), Weight (muted). No zebra striping — use subtle bottom borders between rows.

**Return badges** — small pill: green background `#064e3b` + green text `#34d399` for positive, red background `#450a0a` + red text `#f87171` for negative.

## Charts (Recharts)

- Donut/pie: no labels on slices — use a legend to the right instead
- Bar charts: horizontal orientation for region/sector breakdowns
- Line chart (performance page): single line in accent blue `#6c8cff`, no fill area, subtle grid lines in `rgba(255,255,255,0.05)`
- Tooltips: dark background `#1e2533`, 12px text, white value, muted label

## Pages

### Overview (default)
1. Page title + last import date
2. Metric cards row: Portfolio value, Total return, TWR, IRR
3. Charts row: Sector donut | Region bars | Top holdings mini-list
4. Full holdings table

### Performance
1. Metric cards: Total return, TWR, IRR, Max drawdown
2. Line chart — portfolio value over time (full width)
3. Comparison bar — portfolio vs benchmark (e.g. AEX, S&P 500)

### Breakdown
1. Sector donut (large) + sector table
2. Region donut (large) + region table
3. Asset type breakdown

### Holdings
Full sortable table of all positions with: Ticker, Name, ISIN, Shares, Avg cost, Current price, Value, Return %, Weight %

### Import CSV
Drag-and-drop upload area, DEGIRO CSV only, shows preview of parsed transactions before confirming import.

## Typography

- Font: system sans-serif (no custom font needed)
- Page title: 17px, weight 500, white
- Section labels / card titles: 11px, uppercase, letter-spacing 0.5px, muted gray
- Body / table: 13px, weight 400
- Large numbers: 20px, weight 500

## Do not use

- Gradients anywhere
- Box shadows
- Rounded corners larger than 8px on cards
- Animations or transitions except subtle hover states
- Light mode (dark only for v1)
- Emojis or icons beyond simple SVG shapes
# Project Goals

- Import DEGIRO transaction history via CSV upload
- Show portfolio breakdown by sector, region, and asset class
- Show performance metrics (TWR, IRR, total return)
- Accessible via web browser

## Roadmap

### Completed

- **v1** — CSV import (DeGiro), portfolio breakdown by sector/region/asset class, performance metrics (TWR, IRR, total return)
- **v2** — Dynamic price updates: manual "Refresh Prices" button on Overview + scheduled background job (APScheduler, daily at 18:30 UTC) via yfinance
- **v3 (partial)** — Earnings calendar: upcoming earnings dates per holding fetched from yfinance and shown in a calendar view

### Short list (next releases)

- **v3 (remainder)** — Dividend income tracker: log dividend payments per holding, show monthly/annual income view, yield-on-cost, and projected forward income
- **v4** — Multi-broker support: add importers for Interactive Brokers and Trading 212 CSV formats alongside the existing DeGiro importer
- **v5** — Portfolio goals & target allocation: define target allocation per asset class or sector, show a gap chart (current vs. target) for rebalancing guidance
- **v6** — Realized gains / tax report: table of closed positions with buy cost, sell price, realized P&L, and holding period
- **v7** — Detailed stock analysis: per-holding page showing key investor metrics — P/E ratio, EPS, free cash flow, EBITDA, revenue, debt/equity, dividend yield — fetched from yfinance

### Long list (future releases)

- **v8** — Benchmark comparison: overlay portfolio value over time against a benchmark index (S&P 500, MSCI World, AEX)
- **v9** — Multi-currency support with FX history: convert all values to a home currency using historical FX rates, not just spot price
- **v10** — Watchlist: track tickers not yet owned — price, 52-week range, P/E — as a companion to the holdings view
- **v11** — News feed per holding: surface recent headlines for each position via a financial news API (e.g. Marketaux)
- **v12** — Mobile-friendly PWA: installable Progressive Web App with a responsive layout optimised for phone screens

## Out of Scope (for now)
- Open Banking / live broker sync
- Multi-user support

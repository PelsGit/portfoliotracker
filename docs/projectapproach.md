# Project Goals

- Import DEGIRO transaction history via CSV upload
- Show portfolio breakdown by sector, region, and asset class
- Show performance metrics (TWR, IRR, total return)
- Accessible via web browser

## Roadmap
- **v1:** CSV import + portfolio breakdown + performance metrics
- **v2 (in progress):** Dynamic price updates — stock prices refresh automatically so the dashboard always reflects live market values. CSV import only needed after actual trades (buys/sells). Includes a manual "Refresh Prices" button on the Overview page and a scheduled background job (APScheduler, daily at 18:30 UTC) that re-fetches prices via yfinance.
- **v3:** Dividend tracking + calendar
- **v4:** Multi-broker support

## Out of Scope (v1)
- Dynamic price updates (v2)
- Dividend tracking (v3)
- Multi-broker support (v4)
- Open Banking / live broker sync
- Tax reporting
- Multi-user support
- Mobile app

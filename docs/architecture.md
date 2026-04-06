# Architecture

## Overview

```
┌─────────────┐     CSV upload      ┌─────────────────┐
│   Browser   │ ──────────────────► │    Frontend     │
│  (React)    │ ◄────────────────── │  nginx:3000     │
└─────────────┘     JSON / REST     └────────┬────────┘
                                             │ API calls
                                    ┌────────▼────────┐
                                    │    Backend      │
                                    │  FastAPI:8000   │
                                    └────────┬────────┘
                                             │
                          ┌──────────────────┼──────────────────┐
                          │                  │                  │
                 ┌────────▼───────┐ ┌────────▼───────┐ ┌───────▼────────┐
                 │  PostgreSQL    │ │    yfinance    │ │  CSV Parser    │
                 │  db:5432       │ │  (Yahoo Fin.)  │ │  (on upload)   │
                 └────────────────┘ └────────────────┘ └────────────────┘
```

## Data Flow

### CSV Import
1. User uploads DEGIRO CSV via the frontend
2. Frontend POSTs the file to `POST /api/import/degiro`
3. Backend parses CSV into normalised `Transaction` objects
4. Transactions are stored in PostgreSQL
5. Backend triggers a background price fetch for all ISINs in the portfolio
6. Prices are cached in PostgreSQL

### Portfolio View
1. Frontend calls `GET /api/portfolio/breakdown`
2. Backend reads transactions + cached prices from PostgreSQL
3. Backend calculates current holdings, weights, sector/region allocation
4. Returns JSON — frontend renders charts

### Performance Metrics
1. Frontend calls `GET /api/portfolio/performance`
2. Backend reads full transaction history + historical prices from PostgreSQL
3. Backend calculates TWR, IRR, total return
4. Returns JSON — frontend renders line chart

## Container Layout

| Container | Image | Port | Purpose |
|---|---|---|---|
| `frontend` | nginx + React build | 3000 | Serves the web UI |
| `backend` | Python 3.12 | 8000 | REST API + business logic |
| `db` | PostgreSQL 16 | 5432 | Persistent storage |

## Environment Variables

All configuration via environment variables — no hardcoded secrets.

| Variable | Container | Description |
|---|---|---|
| `DATABASE_URL` | backend | PostgreSQL connection string |
| `CORS_ORIGINS` | backend | Allowed frontend origins |
| `VITE_API_URL` | frontend | Backend API base URL |

## Local vs Production

| | Local (Proxmox) | Production (Azure) |
|---|---|---|
| Orchestration | Docker Compose | Azure Container Apps or AKS |
| Database | PostgreSQL container | Azure Database for PostgreSQL |
| Secrets | `.env` file | Azure Key Vault / Container Apps secrets |
| Ingress | Direct port access | HTTPS via Container Apps ingress or AKS ingress controller |

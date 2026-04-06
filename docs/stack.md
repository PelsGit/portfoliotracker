# Stack Rationale

## Backend — Python 3.12 + FastAPI

Python is the natural choice for financial data work. The ecosystem (pandas, yfinance, numpy) handles portfolio calculations cleanly. FastAPI gives async performance, automatic OpenAPI docs, and clean type hints via Pydantic — which matters when modelling financial data structures.

## Frontend — React 18 + Recharts

React is well-suited for a data-heavy dashboard. Recharts is built on D3 but exposes a simple React component API — good for pie charts (allocation), line charts (performance over time), and bar charts (sector/region breakdown) without a steep learning curve.

## Database — PostgreSQL 16

PostgreSQL runs as a separate container, which mirrors how it would run in production on Azure (Azure Database for PostgreSQL) or as a sidecar/separate deployment on AKS. Avoids SQLite's limitations around concurrent access and makes the local-to-cloud migration straightforward.

## Price Data — yfinance

Yahoo Finance via yfinance is free, requires no API key, and covers all major exchanges including Euronext Amsterdam (DEGIRO's primary exchange). Prices are fetched once and cached in PostgreSQL — the app never calls yfinance on a live request.

## Containerisation — Docker Compose → AKS / Azure Container Apps

Three containers:
- `backend` — FastAPI app
- `frontend` — React app served via nginx
- `db` — PostgreSQL

Docker Compose is used locally on Proxmox. The same container images are deployable to Azure Container Apps (simpler, good for getting started) or AKS (full Kubernetes, more control). No code changes needed between environments — only config via environment variables.

## Why not a single container?

Separating backend, frontend, and database into distinct containers is standard practice and directly maps to how the app will run in production. It also makes it easier to scale or replace individual components later (e.g. swap PostgreSQL for Azure Database for PostgreSQL Flexible Server).

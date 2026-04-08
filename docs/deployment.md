# Deployment

## Repository

Public GitHub repository. Secrets are never committed — use `.env` files locally and on the VM.

## Branch Strategy

| Branch | Purpose | Example |
|---|---|---|
| `main` | Production-ready code only | — |
| `feature/short-description` | New features | `feature/sector-breakdown` |
| `bugfix/short-description` | Bug fixes | `bugfix/csv-date-parsing` |

Rules:
- Never commit directly to `main`
- Feature and bugfix branches are created from `main`
- Merge back to `main` via pull request
- Every commit is not a pull request, only do a pull request when the feature is completed, see definition of done.
- You can not complete a pull request, this must be done by humans. Notify @pelsgit or Rutger Pels when you have a PR waiting
- Delete branch after merge

## Secrets Management

Never commit secrets. Use a `.env` file in the project root (gitignored).

Create it manually before running the stack:

```bash
touch .env
```

### Required variables

```dotenv
# PostgreSQL credentials — used by both the db and backend containers
POSTGRES_USER=portfolio_user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=portfolio

# Full connection string for SQLAlchemy (must match the credentials above)
# Host is always "db" — the Docker Compose service name
DATABASE_URL=postgresql://portfolio_user:changeme@db:5432/portfolio

# Allowed origins for the FastAPI CORS middleware
# On the VM use the LAN IP so your laptop can reach the API
CORS_ORIGINS=http://192.168.2.178:3000

# URL the Vite frontend uses to reach the backend API
# Must be the VM's LAN IP — localhost would break calls from your laptop
VITE_API_URL=http://192.168.2.178:8000
```

| Variable | Used by | Purpose |
|---|---|---|
| `POSTGRES_USER` | db, backend | Database username |
| `POSTGRES_PASSWORD` | db, backend | Database password |
| `POSTGRES_DB` | db, backend | Database name |
| `DATABASE_URL` | backend | SQLAlchemy connection string |
| `CORS_ORIGINS` | backend | Allowed browser origins for CORS |
| `VITE_API_URL` | frontend (build) | Base URL baked into the frontend bundle |

## Local Development (Laptop)

```bash
git clone https://github.com/rutgerpels/<repo-name>
cd portfolio-tracker
# Create .env with the variables documented in Secrets Management above
docker compose up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:8000
API docs: http://localhost:8000/docs

## VM Deployment (Proxmox)

The VM runs the deployed version pulled from `main`.

**Deploying updates:**
```bash
git pull origin main
docker compose up --build -d
```

## Deploy Workflow

1. Create branch: `git checkout -b feature/my-feature`
2. Develop and commit locally
3. Push: `git push origin feature/my-feature`
4. Open pull request on GitHub → merge to `main`
5. SSH into VM and run deploy commands

Claude Code can automate step 5 via SSH after a merge to `main`.

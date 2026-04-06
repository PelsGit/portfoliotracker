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

Never commit secrets. Use `.env` files which are gitignored.

```bash
# Copy the template and fill in your values
cp .env.example .env
```

`.env.example` is committed and documents all required variables with placeholder values.

Required variables:
```
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=portfolio
DATABASE_URL=postgresql://user:pass@db:5432/portfolio
CORS_ORIGINS=http://localhost:3000
VITE_API_URL=http://localhost:8000
```

## Local Development (Laptop)

```bash
git clone https://github.com/rutgerpels/<repo-name>
cd portfolio-tracker
cp .env.example .env        # fill in your values
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

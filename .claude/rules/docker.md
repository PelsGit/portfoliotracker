---
description: Docker Compose conventions and commands
---

# Docker Rules

## Running the stack

```bash
docker compose up --build        # rebuild and start (foreground)
docker compose up --build -d     # rebuild and start (background)
docker compose down              # stop containers
docker compose down -v           # stop and remove volumes (destructive)
```

## Running commands inside containers

Always use `docker compose exec` to run commands inside a running container:
```bash
docker compose exec backend pytest           # run backend tests
docker compose exec backend pip install X    # install a package
docker compose exec frontend npm run test    # run frontend tests
```

## Services

| Service | Container name | Port |
|---|---|---|
| FastAPI backend | `backend` | 8000 |
| React frontend | `frontend` | 3000 |
| PostgreSQL | `db` | 5432 (internal only) |

## Rules

- NEVER expose port 5432 externally in docker-compose.yml
- Always use environment variables from `.env` — no hardcoded values
- Always add a `healthcheck` to the db service so backend waits for it
- Use named volumes for PostgreSQL data persistence
- NEVER run `docker compose down -v` in production — it deletes the database

---
description: Testing requirements for all backend and frontend code
---

# Testing Rules

## When to run tests

- Run tests after completing every feature or bugfix
- All tests must pass before committing
- NEVER commit code with failing tests

## Backend (pytest)

Run inside the backend container:
```bash
docker compose exec backend pytest
docker compose exec backend pytest --cov=app --cov-report=term-missing
```

Test files live in `backend/tests/`:
- `test_degiro_importer.py` — CSV parsing, edge cases, Dutch number formatting
- `test_calculations.py` — TWR, IRR, total return math
- `test_api.py` — FastAPI endpoint responses and shapes

Rules:
- Every new importer function must have a corresponding unit test
- Every calculation function must have a unit test with known input/output values
- API tests must cover both happy path and error cases (invalid CSV, missing fields)
- Mock yfinance calls in tests — never call external APIs in the test suite

## Frontend (Vitest)

Run inside the frontend container:
```bash
docker compose exec frontend npm run test
```

Test files live next to source files: `Component.test.jsx`

Rules:
- Smoke test every new page component — verify it renders without crashing
- Test any data transformation logic (formatting numbers, dates, currencies)
- Do NOT test visual styling — test behaviour only

## Health check after deploy

After every `docker compose up` on the VM, verify services are up:
```bash
curl -f http://localhost:8000/health
curl -f http://localhost:3000
```

## What Claude Code must do

1. Write tests for any new feature BEFORE committing
2. Run the full test suite and confirm it passes
3. Fix any failures before moving on
4. NEVER modify existing tests to make them pass — fix the implementation instead

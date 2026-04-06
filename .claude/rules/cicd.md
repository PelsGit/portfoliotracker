---
description: CI/CD workflow and Claude Code's role in the pipeline
---

# CI/CD Rules

## Claude Code's role

Claude Code is responsible for:
- Building features and fixing bugs on feature/bugfix branches
- Running tests locally before every commit
- Opening pull requests when a feature or bugfix is complete
- Investigating and fixing CI failures autonomously when triggered

Claude Code is NOT responsible for:
- Merging pull requests (the developer does this)
- Deploying to the VM (done manually after merge)
- Modifying branch protection rules or CI configuration

## When a feature or bugfix is complete

1. Confirm all tests pass locally:
   ```bash
   docker compose run --rm backend pytest
   docker compose run --rm frontend npm run test
   docker compose run --rm backend ruff check app/
   ```
2. Commit all changes to the feature/bugfix branch
3. Push the branch to GitHub
4. Open a pull request using the GitHub CLI:
   ```bash
   gh pr create --title "short description" --body "what was built or fixed"
   ```
5. STOP — do not merge. CI will run automatically.

## When triggered to fix a CI failure

GitHub Actions will trigger Claude Code on the VM when PR checks fail.
When this happens:

1. Run the failing tests locally to reproduce the error
2. Read the output carefully — understand the root cause
3. Fix the implementation (NEVER modify tests to make them pass)
4. Run the full test suite to confirm everything passes
5. Run the linter
6. Commit with message: `fix: resolve CI failure on PR #N`
7. Push to the same branch
8. STOP — GitHub Actions will re-run the checks automatically

## CI checks that must pass before merge

All three must be green:
- Backend tests (pytest)
- Frontend tests (Vitest)
- Lint (ruff + eslint)

## Never do

- NEVER merge a PR directly from the CLI or code
- NEVER push to `main`
- NEVER modify test files to make tests pass
- NEVER bypass branch protection

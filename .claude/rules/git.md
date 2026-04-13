---
description: Git workflow and branching rules
---

# Git Rules

## Branching

- NEVER commit directly to `main`
- Create `feature/short-description` branches for new features
- Create `bugfix/short-description` branches for bug fixes
- Branch names must be lowercase with hyphens only
- Before every commit, check the current branch name matches the work type — if fixing a bug on a `feature/` branch, create a new `bugfix/` branch first

## Commits

- NEVER commit if tests are failing
- NEVER commit `.env` files
- Write commit messages in imperative tense: "add sector breakdown chart" not "added"
- Keep commits focused — one logical change per commit

## Workflow

1. `git checkout -b feature/your-feature` — create branch from main
2. Make changes, write tests, confirm tests pass
3. `git add .` — stage changes
4. `git commit -m "descriptive message"` — commit
5. `git push origin feature/your-feature` — push branch
6. Open a PR when the feature is complete — see cicd.md for the full PR workflow

## Never do

- NEVER force push
- NEVER run `git push origin main` directly
- NEVER delete branches that haven't been merged

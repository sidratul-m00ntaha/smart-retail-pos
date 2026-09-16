# How we work together

Read this before your first commit.

## The one rule

**Nobody pushes directly to `main`.** Every change goes through a branch and a pull request (PR). GitHub blocks direct pushes.

## One-time setup

```bat
git config --global pull.rebase false
```

## For every task

### 1. Start from the latest `main`
```bat
git switch main
git pull
```

### 2. Create a branch
```bat
git switch -c feature/products-list-page
```
Name it `type/module-what` (lowercase, hyphens):

| Type | For | Example |
|---|---|---|
| `feature/` | new functionality | `feature/products-list-page` |
| `fix/` | bug fixes | `fix/pos-vat-rounding` |
| `docs/` | documentation | `docs/update-readme` |
| `chore/` | setup, packages, config | `chore/add-axios` |

### 3. Commit your work (small commits, often)
```bat
git add .
git status
git commit -m "Add product list endpoint"
```
Before committing, check `git status`: **no `.env`, `node_modules` or `.venv`**.
Commit messages start with a verb: `Add ...`, `Fix ...`, `Update ...`.

### 4. Push your branch
```bat
git push -u origin feature/products-list-page
```
(After the first push, plain `git push` is enough.)

### 5. Open a pull request
On GitHub click **Compare & pull request** → check **base: `main`** → fill in the template → add a teammate under **Reviewers** → **Create pull request**.

### 6. Review and merge
A teammate approves → the author clicks **Merge pull request** → the branch is deleted automatically.

### 7. After merging
```bat
git switch main
git pull
git branch -d feature/products-list-page
```
Start a **new** branch for your next task – never reuse a merged branch.

## If `main` changed while you were working

Bring the latest `main` into your branch:
```bat
git fetch origin
git merge origin/main
```
If Git says **CONFLICT**, don't delete anything – ask the team for help.

## Reviewing a teammate's PR

1. Open the **Files changed** tab. Does it only change what the PR says?
2. No passwords, `.env` files, `node_modules` or `.venv`?
3. If possible, run it on your computer.
4. **Review changes → Approve**, or comment on what needs fixing.

## Avoiding merge conflicts

- Pull `main` often, and keep PRs **small** – merge every few days, not once a month.
- Work mainly in **your own module's files**.
- These files are **shared** – make small changes and tell the team when you edit them:
  `backend/app/main.py`, `backend/requirements.txt`, `frontend/package.json`, `frontend/package-lock.json`, `README.md`
- Don't reformat or rename files you don't own.
- Changed the setup (new package, new `.env` setting)? Update `README.md` / `.env.example` in the same PR.
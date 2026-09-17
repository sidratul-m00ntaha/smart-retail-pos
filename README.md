# Smart Retail POS & AI Business Reporting System

A web-based point-of-sale and retail management system for a single store: products, purchasing, inventory, POS sales, payments, customer dues, invoices, loyalty, reports and an AI Manager Assistant.

> **Status:** Phase 1 – project setup. The app currently shows only a connection-check page; features are not built yet.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, built with Vite |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Pydantic |
| Database | Microsoft SQL Server 2022 (runs in Docker) |
| Authentication | JWT (planned) |
| API docs | Swagger UI (built into FastAPI) |

## Project structure

```text
smart-retail-pos/
├── backend/            FastAPI app (API endpoints, business logic, database models)
├── frontend/           React app (pages, components, API calls)
├── database/init/      SQL scripts that run when the database container starts
├── docs/               PRD, ER diagram and HTML prototype
├── docker-compose.yml  Local SQL Server
└── .env.example        Template for the Docker settings
```

---

## 1. Install these first (once per computer)

| Tool | Version | Download |
|---|---|---|
| Git | latest | https://git-scm.com/downloads |
| Python | **3.12.x** – tick **"Add python.exe to PATH"** | https://www.python.org/downloads/ |
| Node.js | **24 LTS** | https://nodejs.org |
| Docker Desktop | latest (keep "Use WSL 2" checked) | https://www.docker.com/products/docker-desktop/ |
| ODBC Driver 18 for SQL Server | **18**, x64 | https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server |
| VS Code | latest | https://code.visualstudio.com |

Set your Git name, and the email address that is on your GitHub account:

```bat
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Open a **new** terminal and check the versions:

```bat
git --version
python --version
node --version
docker --version
```

> All commands in this README are for **Windows Command Prompt**. In VS Code: *Terminal → New Terminal*, then choose **Command Prompt** from the **⌄** menu next to **+**.

## 2. First-time setup

### 2.1 Clone the repository

Use a folder that is **not** inside OneDrive, Desktop or Documents – OneDrive syncing breaks Git and `node_modules`.

```bat
mkdir C:\Projects
cd /d C:\Projects
git clone https://github.com/sidratul-m00ntaha/smart-retail-pos.git
cd smart-retail-pos
code .
```

### 2.2 Start the database (Docker)

Open **Docker Desktop** and wait until the engine is running. Then, in the project folder:

```bat
copy .env.example .env
```

Open `.env` and change `MSSQL_SA_PASSWORD` to your own password (the rules are written in the file). Then:

```bat
docker compose up -d
docker compose ps -a
```

The first run downloads about 600 MB and takes 1–3 minutes. Expected: `pos-sqlserver` is **Up (healthy)** and `pos-sqlserver-init` is **Exited (0)**.

### 2.3 Set up the backend

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
copy .env.example .env
```

Open `backend\.env` and set:
- `DB_PASSWORD` – the **same** password as `MSSQL_SA_PASSWORD` in the top-level `.env`
- `FIRST_ADMIN_PASSWORD` – a password for your local admin account

Create the tables and starting data (roles, permissions, admin account):

```bat
python -m app.init_db
```

Then start the API:

```bat
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/api/health – it should show `{"api":"ok","database":"ok"}`. Leave this terminal running.

### 2.4 Set up the frontend

Open a **second** terminal in the project folder:

```bat
cd frontend
npm ci
copy .env.example .env
npm run dev
```

Open http://localhost:5173 – you should see **Frontend: ok, Backend API: ok, Database: ok**. 🎉

> Use `npm ci` (not `npm install`) for setup and after pulling changes. It installs exactly the versions in `package-lock.json` and never modifies that file, which avoids merge conflicts.

---

## 3. Daily routine

1. Open **Docker Desktop**, then in the project folder run `docker compose up -d`
2. **Terminal 1 – backend**
   ```bat
   cd backend
   .venv\Scripts\activate
   uvicorn app.main:app --reload
   ```
3. **Terminal 2 – frontend**
   ```bat
   cd frontend
   npm run dev
   ```
4. When you finish: **Ctrl+C** in both terminals, then `docker compose stop` to free memory.

## 4. After pulling teammates' changes

`git pull` lists the files that changed. If any of these changed, run the matching command:

| If this changed | Run |
|---|---|
| `backend/requirements.txt` | in `backend`, with `.venv` active: `python -m pip install -r requirements.txt` |
| `frontend/package-lock.json` | in `frontend`: `npm ci` |
| `docker-compose.yml` or `database/init/` | in the project folder: `docker compose up -d` |
| any `.env.example` | compare it with your `.env` and copy over any new settings |

| new files in `backend/app/models/` | in `backend`, with `.venv` active: `python -m app.init_db` |
| an **existing** table was changed (the PR will say so) | `python -m app.init_db --reset` – ⚠️ deletes your local data |

## 5. Adding a new package

- **Backend:** `python -m pip install <name>`, then add `<name>==<version>` to `backend/requirements.txt` in alphabetical order (`pip show <name>` shows the version).
- **Frontend:** in `frontend`, run `npm install <name>` and commit **both** `package.json` and `package-lock.json`.
- Mention the new package in your pull request so teammates know to reinstall.

---

## Useful addresses

| What | Address |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://127.0.0.1:8000 |
| API documentation (Swagger) | http://127.0.0.1:8000/docs |
| Health check | http://127.0.0.1:8000/api/health |
| SQL Server (for database tools) | Server `127.0.0.1,1433` · login `sa` · your password · trust server certificate |

## Settings files (`.env`)

Everyone creates their own `.env` files from the `.env.example` templates. **`.env` files are never committed.**

| File | Used by | Contains |
|---|---|---|
| `.env` | Docker | SQL Server admin password |
| `backend/.env` | Backend | Database connection (password must match the one above) |
| `frontend/.env` | Frontend | Backend address. **Visible to anyone – never put secrets here.** |

## Docker commands

Run these in the project folder.

| Command | What it does |
|---|---|
| `docker compose up -d` | Start the database |
| `docker compose ps -a` | Show status |
| `docker compose logs sqlserver` | Show SQL Server messages (use when something fails) |
| `docker compose stop` | Stop the database (data is kept) |
| `docker compose down -v` | ⚠️ **Deletes the database and all its data** (full reset) |

## Troubleshooting

| Problem | Fix |
|---|---|
| Docker: `error during connect` | Docker Desktop is not running – open it |
| `pos-sqlserver` shows `Exited (1)` | Password too weak – fix `.env`, run `docker compose down -v`, then `docker compose up -d` |
| `pos-sqlserver` is **unhealthy** after you changed the password | SQL Server keeps the first password – run `docker compose down -v`, then `docker compose up -d` (deletes data) |
| `Ports are not available ... 1433` | Another SQL Server is using port 1433 – set `MSSQL_PORT=1434` in `.env` **and** `DB_PORT=1434` in `backend/.env` |
| `running scripts is disabled on this system` | Your terminal is PowerShell – switch to **Command Prompt** |
| `'uvicorn' is not recognized` | Activate the virtual environment inside `backend`: `.venv\Scripts\activate` |
| `No module named 'app'` | Start uvicorn from inside the `backend` folder |
| `db_password Field required` | `backend/.env` is missing |
| Health check: `IM002 ... Data source name not found` | Install **ODBC Driver 18** (x64) |
| Health check: `Login failed for user 'sa'` | `DB_PASSWORD` in `backend/.env` doesn't match `MSSQL_SA_PASSWORD` in `.env` |
| Health check: `No connection could be made` | SQL Server isn't running (`docker compose up -d`), or `DB_SERVER` is not `127.0.0.1` |
| Page says "Cannot reach the backend" | Start the backend (Terminal 1) |
| Browser console: `blocked by CORS policy` | Open the frontend at exactly http://localhost:5173 and close any other dev server using that port |
| `cd E:\Projects` does nothing | Command Prompt needs `/d` to change drives: `cd /d E:\Projects` |

| `FIRST_ADMIN_PASSWORD is missing in backend/.env` | Add the `FIRST_ADMIN_...` lines from `backend/.env.example` to your `backend/.env` |

## Project documents

- [`docs/POS_System_PRD.docx`](docs/POS_System_PRD.docx) – product requirements (**main reference**)
- [`docs/er-diagram.jpeg`](docs/er-diagram.jpeg) – early ER diagram. It is older than the PRD and is missing several tables; **where they differ, follow the PRD.**
- [`docs/prototype/`](docs/prototype/) – static HTML design mockups (download and open `login.html` in a browser)

## Team workflow

Before your first commit, read **[CONTRIBUTING.md](CONTRIBUTING.md)** – how we use branches and pull requests.
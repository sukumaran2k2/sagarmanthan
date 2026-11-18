# Sagarmanthan

Sagarmanthan is the monitoring portal of the **Ministry of Ports, Shipping and Waterways (MoPSW)**. The Ministry's divisions and the organisations under it, such as major port authorities and other organisations, enter their data here: infrastructure and CSR projects, capital expenditure, asset monetisation (NMP), performance indicators (KPIs), governance work, legal matters such as bills and acts, long-term strategy goals and HR. Officers then use dashboards and reports to track progress across all organisations in one place, and each user sees only the modules an administrator has given them access to.

The application has two parts:

| Part | Folder | Built with | Runs on |
|------|--------|-----------|---------|
| **Backend** (API) | [backend/](backend/) | Node.js 20, Express, `mssql` | port `3000` |
| **Frontend** (website) | [frontend/](frontend/) | React 19, Vite, Tailwind CSS | port `5173` (dev) |

Other pieces it depends on:

- **Microsoft SQL Server** – the database. It is **not** part of this repo or the Docker setup; you run it yourself.
- **ClamAV** – virus scanner for file uploads. Docker starts it for you; without Docker you run it yourself (see [Step 5](#step-5-optional-run-clamav-for-file-uploads)).
- **Google reCAPTCHA** – shown on the login page.

There are two ways to run the project on your computer:

- **[Option A – Docker](#option-a-run-with-docker)**: one command starts the backend, frontend and ClamAV. Best if you just want to use the portal.
- **[Option B – Normal (without Docker)](#option-b-run-without-docker-normal-way)**: run the backend and frontend yourself with `npm`. Best if you are changing code, because changes show up straight away.

Both options need the same database, so do [Before you start](#before-you-start) first.

---

## Contents

- [Project structure](#project-structure)
- [Before you start](#before-you-start)
  - [1. Install the tools](#1-install-the-tools)
  - [2. Get the code](#2-get-the-code)
  - [3. Set up SQL Server and the database](#3-set-up-sql-server-and-the-database)
- [Option A: Run with Docker](#option-a-run-with-docker)
- [Option B: Run without Docker (normal way)](#option-b-run-without-docker-normal-way)
- [Environment variables](#environment-variables)
- [Running tests and lint](#running-tests-and-lint)
- [Database scripts](#database-scripts)
- [Troubleshooting](#troubleshooting)

---

## Project structure

```
sagarmanthan/
├── docker-compose.yml        # Starts clamav + backend + frontend together
├── .env                      # (you create it) values Docker needs to build the frontend
├── backend/
│   ├── server.js             # Entry point: Express app, CORS, scheduled jobs
│   ├── src/
│   │   ├── routes.js         # All API routes
│   │   ├── db.js             # SQL Server connection (retries until the DB is reachable)
│   │   ├── authenticate.js   # JWT check for portal requests
│   │   ├── controllers/      # One folder per module (HR, KPI, Governance, Finance, ...)
│   │   ├── middleware/       # Permission, data-scope and validation checks
│   │   └── utils/            # ClamAV, mail, cookies, token store
│   ├── sql/                  # SQL change scripts, grouped by module
│   ├── migrations/           # Older one-off SQL migrations
│   ├── fileuploads/ ...      # Uploaded files are stored in these folders
│   ├── .env.example          # Copy to .env and fill in
│   └── Dockerfile
└── frontend/
    ├── src/
    │   ├── App.jsx           # Routes
    │   ├── modules/          # One folder per module (screens, api calls, stores)
    │   ├── components/ layouts/ stores/ utils/ config/
    │   └── **/__tests__/     # Jest tests
    ├── nginx.conf            # Used inside the Docker image (serves the site, forwards /api)
    ├── .env.example          # Copy to .env and fill in
    └── Dockerfile
```

---

## Before you start

### 1. Install the tools

| Tool | Version | Needed for | Check with |
|------|---------|-----------|------------|
| [Git](https://git-scm.com/downloads) | any recent | both options | `git --version` |
| [Node.js](https://nodejs.org/) | **20 or newer** (Docker images use 20) | Option B | `node -v` |
| npm | comes with Node.js | Option B | `npm -v` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | with Docker Compose v2 | Option A | `docker compose version` |
| [SQL Server](https://www.microsoft.com/sql-server/sql-server-downloads) (Developer or Express edition) | same or newer version than the backup you restore | both options | – |
| [SQL Server Management Studio (SSMS)](https://learn.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms) | any | restoring the database | – |
| Python 3 + `pip install -r backend/requirements.txt` | optional | only for `backend/projectMediaFileDownload.py` | `python --version` |

### 2. Get the code

```bash
git clone <repository-url> sagarmanthan
cd sagarmanthan
```

### 3. Set up SQL Server and the database

The database is **not** in this repo (SQL dumps are git-ignored on purpose). Ask a team member for a recent backup (`.bak`) or SQL dump of the `sagarmanthan_revamp` database.

1. **Restore the database.** In SSMS: right-click **Databases → Restore Database…**, pick the `.bak` file, and name it `sagarmanthan_revamp` (or any name – you will put it in `DB_NAME` later).
2. **Turn on SQL Server login (username + password).** The backend logs in with a SQL user, not Windows login.
   - In SSMS: right-click the server → **Properties → Security** → choose **SQL Server and Windows Authentication mode**.
   - Create a login (e.g. `sagar_dev`) under **Security → Logins**, and give it access to the database (`db_owner` is fine on your own computer).
3. **Turn on TCP/IP.** Open **SQL Server Configuration Manager → SQL Server Network Configuration → Protocols for <your instance>** → enable **TCP/IP**. Make sure it listens on port **1433** (IPAll → TCP Port = `1433`).
4. **Restart the SQL Server service** so the changes take effect.
5. Test it: connect in SSMS using **SQL Server Authentication** with the user you made, server `localhost`.

> ⚠️ **The database may contain real user email addresses.** Some actions in the portal send email (for example creating a user or sending alerts). Use a test mailbox such as [Mailtrap](https://mailtrap.io/) for `SMTP_*` (see [Environment variables](#environment-variables)) so no real person gets mail from your computer, and never test with real users' emails.

---

## Option A: Run with Docker

Docker starts three containers:

| Container | What it is | Address on your computer |
|-----------|-----------|--------------------------|
| `sagarmanthan-frontend` | The built website served by nginx. Calls to `/api/...` are forwarded to the backend. | **http://localhost:8080** |
| `sagarmanthan-backend` | The Node.js API | http://localhost:3000 |
| `sagarmanthan-clamav` | Virus scanner used by the backend for uploads | (internal only) |

SQL Server runs **on your computer, outside Docker**. The backend container reaches it through the special name `host.docker.internal`.

### A1. Create `backend/.env`

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set at least:

```env
DB_HOST=host.docker.internal      # keep this for Docker – it means "my computer"
DB_USER=sagar_dev
DB_PASSWORD=your_password
DB_NAME=sagarmanthan_revamp

JWT_SECRET=any-long-random-text
MIKR_SECRET=another-long-random-text
MIKR_REFRESH_SECRET=another-long-random-text
CHAINLIT_AUTH_SECRET=another-long-random-text

# Plain http://localhost – the login cookie must not require HTTPS
COOKIE_SECURE=false
```

Keep the `RSA_PRIVATE_KEY` from the example (it matches the public key in `frontend/.env.example`), and set `RECAPTCHA_SECRET_KEY` – see [reCAPTCHA keys for local use](#recaptcha-keys-for-local-use).

> Don't put an unescaped `$` in any value in this file. Docker Compose treats `$NAME` as a variable and will change your value. Write `$$` if you need a literal `$`.

You do **not** need to set `CLAMAV_HOST`, `CLAMD_HOST` or `PORT` – `docker-compose.yml` sets them.

### A2. Create the root `.env` (frontend build values)

The frontend is built **inside** Docker, and Vite copies `VITE_*` values into the website at build time. Docker Compose reads them from a file named `.env` in the **project root** (next to `docker-compose.yml`):

```env
# sagarmanthan/.env
VITE_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...same key as frontend/.env.example...\n-----END PUBLIC KEY-----"
VITE_RECAPTCHA_SITE_KEY=your_site_key
# VITE_API_BASE_URL=/api      # default; leave it unless you know you need something else
```

- `VITE_RSA_PUBLIC_KEY` – copy it from `frontend/.env.example`. It **must** match `RSA_PRIVATE_KEY` in `backend/.env`, or login fails (the password is encrypted with this key in the browser).
- `VITE_API_BASE_URL` – leave it as `/api`. nginx in the frontend container forwards `/api/...` to the backend, so the browser never needs to know the backend address.

### A3. Build and start

From the project root:

```bash
docker compose up -d --build
```

The first build takes several minutes (it installs npm packages and builds the frontend). ClamAV also downloads its virus database the first time, which can take **up to 5 minutes**; file uploads that need a scan will fail with "File scanning is unavailable" until it is ready.

### A4. Check it's working

```bash
docker compose ps                 # all three should be "running" / "Up"
docker compose logs -f backend    # look for "DB Connected"
```

- Open **http://localhost:8080** and log in.
- http://localhost:3000/ should return `{"status":"ok","message":"Sagarmanthan API is running"}`.

If the backend log keeps printing `DB connection failed ... retrying in 10 s`, see [Troubleshooting](#backend-cannot-connect-to-the-database).

### Everyday Docker commands

| What you want | Command |
|---------------|---------|
| Start (already built) | `docker compose up -d` |
| Stop | `docker compose down` |
| Rebuild after pulling new code | `docker compose up -d --build` |
| Rebuild only the frontend (e.g. after changing the root `.env`) | `docker compose up -d --build frontend` |
| Restart backend after changing `backend/.env` | `docker compose up -d --force-recreate backend` |
| See logs | `docker compose logs -f backend` (or `frontend`, `clamav`) |
| Open a shell in the backend | `docker compose exec backend sh` |
| Remove everything incl. ClamAV's downloaded data | `docker compose down -v` |

Notes:
- Code changes are **not** picked up automatically in Docker – rebuild with `--build`. For day-to-day coding use Option B.
- Uploaded files are kept on your computer, not inside the container: `backend/fileuploads`, `backend/demoFiles`, `backend/formbuilder_Files` and `backend/delete_log` are mounted into the backend container.

---

## Option B: Run without Docker (normal way)

You run the backend and frontend in two terminals. Both reload automatically when you save a file.

```
Browser ──► http://localhost:5173  (Vite dev server, frontend)
                 │  API calls
                 ▼
            http://localhost:3000  (Node backend) ──► SQL Server (localhost:1433)
                                                 └──► ClamAV (localhost:3310, optional)
```

### Step 1: Install backend packages

```bash
cd backend
npm install
```

### Step 2: Create `backend/.env`

```bash
cp .env.example .env
```

Set the same values as in [A1](#a1-create-backendenv), but with **`DB_HOST=localhost`** (not `host.docker.internal`):

```env
DB_HOST=localhost
DB_USER=sagar_dev
DB_PASSWORD=your_password
DB_NAME=sagarmanthan_revamp

PORT=3000
FRONTEND_URL=http://localhost:5173   # allowed by CORS; this is also the default

JWT_SECRET=any-long-random-text
MIKR_SECRET=another-long-random-text
MIKR_REFRESH_SECRET=another-long-random-text
CHAINLIT_AUTH_SECRET=another-long-random-text

COOKIE_SECURE=false
RECAPTCHA_SECRET_KEY=...             # see "reCAPTCHA keys for local use"
# RSA_PRIVATE_KEY=...                # keep the value from .env.example
```

If SQL Server is a named instance (e.g. SQL Express), use `DB_HOST=localhost` and make sure TCP/IP is on port 1433 (see [step 3 of Before you start](#3-set-up-sql-server-and-the-database)).

### Step 3: Start the backend

```bash
npm run dev      # restarts on every file change (nodemon)
# or
npm start        # plain node, no auto-restart
```

You should see:

```
Sagarmanthan Backend started successfully on port 3000
DB Connected
```

Check http://localhost:3000/ – it should return `{"status":"ok", ...}`.

### Step 4: Set up and start the frontend

Open a **second terminal**:

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `frontend/.env`:

```env
# Without Docker the browser talks to the backend directly – no /api at the end
VITE_API_BASE_URL=http://localhost:3000

VITE_RECAPTCHA_SITE_KEY=...          # see "reCAPTCHA keys for local use"
# VITE_RSA_PUBLIC_KEY=...            # keep the value from .env.example
```

> ⚠️ Always set `VITE_API_BASE_URL`. If it is missing, the frontend falls back to the **live production server**.

Start it:

```bash
npm run dev
```

Open **http://localhost:5173** and log in.

Vite reads `.env` only when it starts. **After changing `frontend/.env`, stop `npm run dev` (Ctrl+C) and start it again.**

### Step 5 (optional): Run ClamAV for file uploads

When ClamAV isn't reachable, these uploads **refuse** files and show *"File scanning is unavailable"*: MoPSW documents, Young Professionals and GMIS MoU. Other uploads (e.g. CA appointment orders, One Vision One Document) skip the scan and still work. Everything else in the portal works without ClamAV.

The easiest way is to run only ClamAV in Docker:

```bash
docker run -d --name sagarmanthan-clamav-dev -p 3310:3310 clamav/clamav:stable
```

Then add to `backend/.env` and restart the backend:

```env
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
CLAMD_HOST=127.0.0.1
CLAMD_PORT=3310
```

Wait a few minutes after the first start while ClamAV downloads its virus database.

### Step 6 (optional): Build the frontend like production

```bash
cd frontend
npm run build     # output goes to frontend/dist
npm run preview   # serves the built site on http://localhost:4173
```

If you use `preview`, also set `FRONTEND_URL=http://localhost:4173` in `backend/.env`, or the backend blocks the requests (CORS).

---

## Environment variables

### reCAPTCHA keys for local use

The login page needs a reCAPTCHA site key (frontend) and the matching secret key (backend). For local work you can use **Google's public test keys**, which always pass on any domain, including `localhost`:

| Where | Variable | Test value |
|-------|----------|-----------|
| `frontend/.env` (and root `.env` for Docker) | `VITE_RECAPTCHA_SITE_KEY` | `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI` |
| `backend/.env` | `RECAPTCHA_SECRET_KEY` | `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe` |

The backend recognises this test secret and lets login through. **Never use these keys on a real server.** Alternatively, use the project's real keys if `localhost` has been added to their allowed domains.

### Backend – `backend/.env`

**Required**

| Variable | What it is |
|----------|-----------|
| `DB_HOST` | SQL Server address. `localhost` without Docker, `host.docker.internal` with Docker. |
| `DB_USER`, `DB_PASSWORD` | SQL Server login (SQL authentication). |
| `DB_NAME` | Database name, e.g. `sagarmanthan_revamp`. |
| `JWT_SECRET` | Signs the login (access) token. Any long random text. |
| `MIKR_SECRET` | Signs tokens for the Knowledge Repository (MIKR) link; the backend also checks it when reading tokens, so it must be set. |
| `MIKR_REFRESH_SECRET` | Signs the refresh-token cookie that keeps you logged in. |
| `CHAINLIT_AUTH_SECRET` | Signs the token for the chatbot. |
| `RSA_PRIVATE_KEY` | Decrypts the password the browser sends. Must match `VITE_RSA_PUBLIC_KEY`. |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA secret key. |

**Usually needed**

| Variable | Default | What it is |
|----------|---------|-----------|
| `PORT` | `3000` | Port the backend listens on. |
| `FRONTEND_URL` | `http://localhost:5173` | The only website address allowed to call the API (CORS). |
| `COOKIE_SECURE` | `true` if `NODE_ENV=production`, else `false` | Set `false` for plain `http://`, or you get logged out after 30 minutes. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | – | Mail server for emails (use Mailtrap locally). |
| `ALERT_SMTP_HOST`, `ALERT_SMTP_PORT`, `ALERT_SMTP_USER`, `ALERT_SMTP_PASS` | falls back to `SMTP_*` | Mailbox for scheduled alert emails. |

**Optional**

| Variable | What it is |
|----------|-----------|
| `CLAMAV_HOST`, `CLAMAV_PORT`, `CLAMD_HOST`, `CLAMD_PORT` | ClamAV address (set automatically in Docker). |
| `BASE_URL` | Public address of the portal, used in links inside emails. |
| `NODE_ENV` | `production` on servers. |
| `OPENAI_API_KEY` | Turns on full AI answers in the Report Copilot. Without it you get a basic reply. |
| `MIKR_CLIENT_ID`, `MIKR_CLIENT_SECRET`, `MIKR_BASE_URL`, `MIKR_DELETE_PATH`, `MIKR_TLS_REJECT_UNAUTHORIZED` | Knowledge Repository (MIKR) integration. Not needed for normal local work. |
| `SENDER_EMAIL`, `SENDER_PASSWORD` | Only for `projectMediaFileDownload.py`. |

### Frontend – `frontend/.env` (Option B) or root `.env` (Option A)

| Variable | Option B value | Option A value | What it is |
|----------|---------------|---------------|-----------|
| `VITE_API_BASE_URL` | `http://localhost:3000` | `/api` (default) | Where the website sends API calls. |
| `VITE_RSA_PUBLIC_KEY` | from `.env.example` | same | Encrypts the password before it is sent. |
| `VITE_RECAPTCHA_SITE_KEY` | your site key | same | reCAPTCHA on the login page. |

`.env` files are git-ignored. **Never commit real passwords or keys.**

---

## Running tests and lint

Frontend (Jest + React Testing Library; test files live in `src/**/__tests__/*.test.js`):

```bash
cd frontend
npm test              # run all tests once
npm run test:watch    # re-run on file change
npm run lint          # ESLint
```

The backend has no automated tests yet.

---

## Database scripts

Schema and data changes made after the database backup are kept as SQL files in [backend/sql/](backend/sql/), one folder per module (`projects`, `kpi-modules`, `csr`, `bills`, `gem`, ...). Files are numbered (`01_...`, `02_...`) in the order they must run.

If your backup is older than a script, run the missing scripts in SSMS against your local database, in number order. Ask the team which ones your backup already has – some scripts are not safe to run twice.

---

## Troubleshooting

### Backend cannot connect to the database

The log repeats `DB connection failed (...); retrying in 10 s`.

- Is the SQL Server service running? (Windows: **Services → SQL Server (MSSQLSERVER)**)
- Is **TCP/IP** enabled on port **1433**, and was SQL Server restarted after that?
- Is **SQL Server and Windows Authentication mode** on, and can you log in with the same user/password in SSMS?
- Is `DB_HOST` right? `localhost` without Docker, `host.docker.internal` with Docker.
- With Docker on Windows, Windows Firewall may block port 1433 from Docker. Allow inbound TCP 1433.

### Login says "Captcha verification failed"

The site key and secret key don't belong together, or the site key doesn't allow `localhost`. Use the [test keys](#recaptcha-keys-for-local-use) in both places. With Docker, rebuild the frontend afterwards (`docker compose up -d --build frontend`); without Docker, restart `npm run dev`.

### Login fails with "Decryption failed"

`VITE_RSA_PUBLIC_KEY` (frontend) and `RSA_PRIVATE_KEY` (backend) are not a matching pair. Use the pair from the two `.env.example` files, or generate a new pair and put one half in each.

### Browser console shows a CORS error

`FRONTEND_URL` in `backend/.env` must be exactly the address in your browser bar, e.g. `http://localhost:5173` (no slash at the end). Restart the backend after changing it.

### Frontend calls the live server instead of my local backend

`VITE_API_BASE_URL` is missing from `frontend/.env`, or you didn't restart `npm run dev` after adding it.

### I get logged out after about 30 minutes

The refresh cookie was dropped because it was marked HTTPS-only. Set `COOKIE_SECURE=false` in `backend/.env` when using `http://`.

### Uploads fail with "File scanning is unavailable"

ClamAV isn't reachable or hasn't finished downloading its virus database. With Docker check `docker compose logs clamav`; without Docker see [Step 5](#step-5-optional-run-clamav-for-file-uploads).

### Port already in use

Something else is using 3000, 5173 or 8080. Stop it, or change the port: `PORT` in `backend/.env` (then update `VITE_API_BASE_URL`), `npm run dev -- --port 5174` for Vite (then update `FRONTEND_URL`), or the left number in `ports:` in `docker-compose.yml`.

### Changed a `.env` in Docker but nothing changed

- `backend/.env` → `docker compose up -d --force-recreate backend`
- root `.env` (`VITE_*`) → `docker compose up -d --build frontend` (these are baked in at build time)

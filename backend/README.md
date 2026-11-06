# MONVEX — Backend

Financial transaction and auditable ledger management system.

Built with Python 3.13, Django 5.2, Django REST Framework, PostgreSQL, and Simple JWT.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Prerequisites](#prerequisites)
3. [First-Time Setup](#first-time-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Running Migrations](#running-migrations)
7. [Creating a Superuser](#creating-a-superuser)
8. [Starting the Development Server](#starting-the-development-server)
9. [API Overview](#api-overview)
10. [Application Architecture](#application-architecture)
11. [User Roles and Security](#user-roles-and-security)
12. [Financial Architecture Notes](#financial-architecture-notes)

---

## Project Structure

```
backend/
├── config/               # Django project settings, root URLs, WSGI/ASGI
│   ├── settings.py       # All configuration — reads from .env
│   ├── urls.py           # Root URL dispatcher
│   ├── wsgi.py
│   └── asgi.py
│
├── users/                # Custom user model and authentication
│   ├── models.py         # User model (UUID PK, Role enum)
│   ├── serializers.py    # Registration and profile serializers
│   ├── views.py          # RegisterView, MeView
│   ├── urls.py           # /api/auth/register/, /api/users/me/
│   └── admin.py
│
├── accounts/             # Financial accounts (checking, savings, wallet)
│   ├── models.py         # Account model
│   └── admin.py
│
├── transactions/         # Financial transaction records
│   ├── models.py         # Transaction model (idempotency key, status machine)
│   └── admin.py
│
├── ledger/               # Double-entry ledger entries (append-only)
│   ├── models.py         # LedgerEntry model (DEBIT / CREDIT)
│   └── admin.py
│
├── audit/                # Immutable audit trail
│   ├── models.py         # AuditLog model
│   └── admin.py
│
├── manage.py
├── .env.example          # Template — copy to .env and fill in values
├── .gitignore
└── README.md             # This file
```

---

## Prerequisites

Make sure these are installed on your machine before starting.

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.13+ | Runtime |
| PostgreSQL | 14+ | Database |
| pip | latest | Package installer |

You do **not** need to install any extra Python packages manually — the virtual
environment already contains all dependencies.

---

## First-Time Setup

### 1. Navigate to the backend directory

```powershell
cd backend
```

### 2. Activate the virtual environment

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
source .venv/bin/activate
```

You will know it is active when you see `(.venv)` at the start of your terminal prompt.

### 3. Verify installed dependencies

```powershell
pip list
```

You should see Django, djangorestframework, djangorestframework-simplejwt,
psycopg, django-environ, django-cors-headers, django-filter, and drf-spectacular.

If any package is missing, install all dependencies at once:

```powershell
pip install -r requirements.txt
```

> **Note:** A `requirements.txt` file does not exist yet in this project.
> To generate one from the current environment, run:
> ```powershell
> pip freeze > requirements.txt
> ```

---

## Environment Configuration

The application reads all sensitive settings from a `.env` file.
**Never commit `.env` to version control.**

### 1. Copy the example file

```powershell
Copy-Item .env.example .env
```

### 2. Edit `.env` and fill in your values

Open `.env` in your editor and replace every `<CHANGE_ME>` placeholder.

```env
# Generate a secret key with this command (run it, copy the output):
# python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-generated-secret-key-here

DEBUG=True

ALLOWED_HOSTS=localhost,127.0.0.1

# Format: postgres://USER:PASSWORD@HOST:PORT/DBNAME
DATABASE_URL=postgres://monvex_user:yourpassword@localhost:5432/monvex_db

JWT_ACCESS_TOKEN_MINUTES=60
JWT_REFRESH_TOKEN_DAYS=7

CORS_ALLOWED_ORIGINS=http://localhost:5173
```

### Key settings explained

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Django's cryptographic signing key. Must be long, random, and secret. | `django-...` (50+ chars) |
| `DEBUG` | Set `True` locally, `False` in production. | `True` |
| `DATABASE_URL` | Full PostgreSQL connection string. | `postgres://user:pass@localhost:5432/dbname` |
| `JWT_ACCESS_TOKEN_MINUTES` | How long access tokens are valid. | `60` |
| `JWT_REFRESH_TOKEN_DAYS` | How long refresh tokens are valid. | `7` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins. | `http://localhost:5173` |

---

## Database Setup

### 1. Start PostgreSQL

Make sure your PostgreSQL service is running.

**Windows (PowerShell — if installed as a service):**
```powershell
Start-Service postgresql*
```

### 2. Create the database and user

Connect to PostgreSQL as the `postgres` superuser:

```powershell
psql -U postgres
```

Then run these SQL commands (replace placeholders with values that match your `.env`):

```sql
CREATE USER monvex_user WITH PASSWORD 'yourpassword';
CREATE DATABASE monvex_db OWNER monvex_user;
GRANT ALL PRIVILEGES ON DATABASE monvex_db TO monvex_user;
\q
```

### 3. Test the connection

```powershell
psql -U monvex_user -d monvex_db -h localhost
```

If you connect successfully, type `\q` to exit.

---

## Running Migrations

> **Important:** Do not run migrations until your `.env` file is configured
> and PostgreSQL is running. The application will refuse to start without a
> valid `DATABASE_URL`.

### Create migration files

```powershell
python manage.py makemigrations
```

This inspects all models and generates migration files inside each app's
`migrations/` folder.

### Apply migrations to the database

```powershell
python manage.py migrate
```

This creates all the tables in your PostgreSQL database.

### Verify migrations applied

```powershell
python manage.py showmigrations
```

All migrations should show `[X]` (applied).

---

## Creating a Superuser

A superuser has full access to the Django admin panel (`/admin/`).

```powershell
python manage.py createsuperuser
```

You will be prompted for a username, email, and password.

> **Security note:** The `createsuperuser` command creates a user with
> `is_superuser=True` and `is_staff=True`. You should also set the role to
> `ADMIN` manually in the admin panel for clarity. Future versions will
> include a bootstrap management command that does this automatically.

---

## Starting the Development Server

```powershell
python manage.py runserver
```

The API will be available at: `http://127.0.0.1:8000/`

---

## API Overview

All API endpoints are prefixed with `/api/`.

### Authentication

| Method | Endpoint | Auth required | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/auth/register/` | No | Create a new ACCOUNT_HOLDER user |
| `POST` | `/api/auth/token/` | No | Login — returns access + refresh tokens |
| `POST` | `/api/auth/token/refresh/` | No | Exchange refresh token for a new access token |

### Users

| Method | Endpoint | Auth required | Description |
|--------|----------|--------------|-------------|
| `GET` | `/api/users/me/` | Yes | Get the logged-in user's profile |

### Documentation

| URL | Description |
|-----|-------------|
| `http://127.0.0.1:8000/api/docs/` | Swagger UI — interactive API explorer |
| `http://127.0.0.1:8000/api/redoc/` | ReDoc — clean API reference |
| `http://127.0.0.1:8000/api/schema/` | Raw OpenAPI 3 schema (JSON) |

### Django Admin

| URL | Description |
|-----|-------------|
| `http://127.0.0.1:8000/admin/` | Admin panel (superuser login required) |

### How to authenticate

**Step 1 — Register:**
```http
POST /api/auth/register/
Content-Type: application/json

{
    "username": "alice",
    "email": "alice@example.com",
    "password": "StrongPassword123!"
}
```

**Step 2 — Login (obtain tokens):**
```http
POST /api/auth/token/
Content-Type: application/json

{
    "username": "alice",
    "password": "StrongPassword123!"
}
```
Response:
```json
{
    "access":  "eyJ...",
    "refresh": "eyJ..."
}
```

**Step 3 — Use the access token:**
```http
GET /api/users/me/
Authorization: Bearer eyJ...
```

**Step 4 — Refresh when access token expires:**
```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
    "refresh": "eyJ..."
}
```

---

## Application Architecture

### How the apps relate to each other

```
users ──────────────────────────────────────────────┐
  └── owns ──► accounts                             │
                  └── participates in ──► transactions
                                             └── produces ──► ledger (LedgerEntry)
                                                                    │
                                             all events ────────────► audit (AuditLog)
```

### Data flow for a future financial transaction

```
API Request
    │
    ▼
Transaction created (status=PENDING)
    │
    ▼
Atomic DB block (BEGIN)
    ├── SELECT FOR UPDATE on source account      ← row-level lock
    ├── SELECT FOR UPDATE on destination account ← row-level lock
    ├── Check sufficient balance
    ├── Write LedgerEntry DEBIT  (source account)
    ├── Write LedgerEntry CREDIT (destination account)
    ├── Update source account balance
    ├── Update destination account balance
    └── Set Transaction status=COMPLETED
COMMIT
    │
    ▼
AuditLog entry written (post_save signal)
```

---

## User Roles and Security

| Role | Created by | Can do |
|------|-----------|--------|
| `ACCOUNT_HOLDER` | Public registration (`/api/auth/register/`) | Manage own accounts and transactions |
| `ADMIN` | Django superuser via admin panel or management command | Full system access |
| `AUDITOR` | Admin via admin panel | Read-only access to audit trails and ledger |

**Security guarantees in the codebase:**

- `PublicRegistrationSerializer` does not include the `role` field. Even if a
  client sends `"role": "ADMIN"` in the request body, it is ignored.
- The `create()` method in `PublicRegistrationSerializer` hard-codes
  `role=User.Role.ACCOUNT_HOLDER` regardless of any input.
- Passwords are hashed by Django's `create_user()` using PBKDF2-SHA256.
- JWT access tokens expire after 60 minutes (configurable via `JWT_ACCESS_TOKEN_MINUTES`).
- Refresh token rotation is enabled — each refresh issues a new refresh token.

---

## Financial Architecture Notes

The following features are **designed but not yet implemented**. The models are
in place; the business logic will be added in the next phase.

| Feature | Where it lives | Status |
|---------|---------------|--------|
| Double-entry ledger | `ledger/models.py` — `LedgerEntry` | Model ready |
| Atomic transactions | `transactions/` + `django.db.transaction.atomic` | Model ready |
| PostgreSQL row-level locking | `SELECT FOR UPDATE` inside atomic block | Not implemented |
| Idempotency keys | `Transaction.idempotency_key` (unique UUID) | Model ready |
| Append-only ledger protection | Django signal + optional DB trigger | Not implemented |
| Per-account authorization | `Account.owner` FK + permission checks in views | Model ready |
| Financial audit trails | `audit/models.py` — `AuditLog` | Model ready |

---

## Running Django System Checks

Django has a built-in check framework that detects common configuration errors.

```powershell
python manage.py check
```

To also check for database-level issues (requires a running database):

```powershell
python manage.py check --database default
```

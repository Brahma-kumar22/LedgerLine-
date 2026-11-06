"""
config/settings.py

Django settings for MONVEX — Financial Transaction and Auditable Ledger
Management System.

All sensitive values are loaded from environment variables via django-environ.
Never hardcode secrets, passwords, or connection strings in this file.

Quick-start for a new developer:
    1. cp .env.example .env
    2. Fill in SECRET_KEY and DATABASE_URL.
    3. Activate the virtual environment: .venv\\Scripts\\Activate.ps1
    4. python manage.py migrate
    5. python manage.py bootstrap_admin
    6. python manage.py runserver
"""

from datetime import timedelta
from pathlib import Path

import environ

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
    CONN_MAX_AGE=(int, 60),
)

# Read .env from the backend/ directory when it exists.
# Production environments inject variables directly — no .env file needed.
environ.Env.read_env(BASE_DIR / ".env")

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------

# Raises django.core.exceptions.ImproperlyConfigured when SECRET_KEY is absent.
SECRET_KEY = env("SECRET_KEY")

DEBUG = env("DEBUG")

ALLOWED_HOSTS = env("ALLOWED_HOSTS")

# ---------------------------------------------------------------------------
# Custom user model — must be set before the first migration
# ---------------------------------------------------------------------------

AUTH_USER_MODEL = "users.User"

# ---------------------------------------------------------------------------
# Installed applications
# ---------------------------------------------------------------------------

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
]

LOCAL_APPS = [
    "users",
    "accounts",
    "transactions",
    "ledger",
    "audit",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------------------------------------------------------------------------
# Middleware — CorsMiddleware must precede CommonMiddleware
# ---------------------------------------------------------------------------

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ---------------------------------------------------------------------------
# URLs / WSGI
# ---------------------------------------------------------------------------

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database — PostgreSQL only (Neon or local)
# ---------------------------------------------------------------------------
# DATABASE_URL format for Neon:
#   postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
#
# django-environ maps the scheme to ENGINE automatically.
# psycopg v3 is installed; Django 4.2+ detects it when the legacy
# backend name "django.db.backends.postgresql" is used.
#
# CONN_MAX_AGE controls connection persistence:
#   0   — close after every request (recommended for serverless / Neon)
#   60  — reuse connections for up to 60 seconds (long-running servers)
#
# The app raises ImproperlyConfigured if DATABASE_URL is absent or empty.

_db_config = env.db("DATABASE_URL")

# Inject SSL and connection-age settings only when a real URL was provided.
# An empty DATABASE_URL produces an ENGINE='' config — we leave it as-is so
# that Django system checks and makemigrations can still load without crashing.
# The app will fail at actual DB connection time, which is the correct behaviour.
if _db_config.get("ENGINE"):
    # Neon requires SSL. django-environ parses ?sslmode=require from the URL
    # into OPTIONS automatically. We add this as an explicit guarantee so the
    # app never connects without encryption even if the URL omits the param.
    if "OPTIONS" not in _db_config:
        _db_config["OPTIONS"] = {}
    _db_config["OPTIONS"].setdefault("sslmode", "require")
    _db_config["CONN_MAX_AGE"] = env.int("CONN_MAX_AGE", default=60)

DATABASES = {"default": _db_config}

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files
# ---------------------------------------------------------------------------

STATIC_URL = "static/"

# ---------------------------------------------------------------------------
# Primary key default type
# ---------------------------------------------------------------------------

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    # All endpoints require authentication unless explicitly overridden.
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# ---------------------------------------------------------------------------
# Simple JWT
# ---------------------------------------------------------------------------
# Environment variable names match the specification:
#   ACCESS_TOKEN_LIFETIME_MINUTES
#   REFRESH_TOKEN_LIFETIME_DAYS

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME":  timedelta(
        minutes=env.int("ACCESS_TOKEN_LIFETIME_MINUTES", default=30)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("REFRESH_TOKEN_LIFETIME_DAYS", default=7)
    ),
    # Token rotation: each refresh call issues a new refresh token.
    "ROTATE_REFRESH_TOKENS":    True,
    # Blacklisting not enabled yet; set True when blacklist app is added.
    "BLACKLIST_AFTER_ROTATION": False,
    # Update last_login on every token issue.
    "UPDATE_LAST_LOGIN":        True,
    "ALGORITHM":                "HS256",
    "SIGNING_KEY":              SECRET_KEY,
    "AUTH_HEADER_TYPES":        ("Bearer",),
    "USER_ID_FIELD":            "id",
    "USER_ID_CLAIM":            "user_id",
}

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# API Documentation (drf-spectacular)
# ---------------------------------------------------------------------------

SPECTACULAR_SETTINGS = {
    "TITLE":                "MONVEX API",
    "DESCRIPTION":          "Financial Transaction and Auditable Ledger Management System.",
    "VERSION":              "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# ---------------------------------------------------------------------------
# Security hardening
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# System accounts for double-entry external clearing
# ---------------------------------------------------------------------------
# UUIDs of the two notional accounts used to balance deposits and withdrawals.
# Set by running: python manage.py create_system_accounts
# Then copy the printed UUIDs into .env.
EXTERNAL_FUNDING_ACCOUNT_ID    = env("EXTERNAL_FUNDING_ACCOUNT_ID",    default="")
EXTERNAL_SETTLEMENT_ACCOUNT_ID = env("EXTERNAL_SETTLEMENT_ACCOUNT_ID", default="")

# ---------------------------------------------------------------------------
# Security hardening
# ---------------------------------------------------------------------------
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS              = "DENY"

SECURE_SSL_REDIRECT              = env.bool("SECURE_SSL_REDIRECT",              default=False)
SECURE_HSTS_SECONDS              = env.int( "SECURE_HSTS_SECONDS",              default=0)
SECURE_HSTS_INCLUDE_SUBDOMAINS   = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS",   default=False)
SECURE_HSTS_PRELOAD              = env.bool("SECURE_HSTS_PRELOAD",              default=False)
SESSION_COOKIE_SECURE            = env.bool("SESSION_COOKIE_SECURE",            default=False)
CSRF_COOKIE_SECURE               = env.bool("CSRF_COOKIE_SECURE",               default=False)

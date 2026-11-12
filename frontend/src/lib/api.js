/**
 * lib/api.js
 *
 * Centralized Axios HTTP client for MONVEX.
 *
 * FEATURES:
 *   - Base URL from VITE_API_BASE_URL environment variable
 *   - 30-second request timeout
 *   - Request interceptor: attaches JWT access token as Bearer header
 *   - Response interceptor: normalizes API errors into a consistent shape
 *   - Automatic 401 handling: attempts token refresh, retries original request
 *   - Duplicate-refresh prevention: only one refresh call runs at a time,
 *     queued requests wait for the refresh result
 *   - Idempotency-Key header injection helper for money-moving endpoints
 *
 * BACKEND CONTRACT (verified from source):
 *   POST /api/auth/token/         {username, password} → {access, refresh}
 *   POST /api/auth/token/refresh/ {refresh}            → {access, refresh}
 *     ROTATE_REFRESH_TOKENS=True → new refresh token returned each time
 *   POST /api/auth/register/      {username, email, password} → user object
 *   GET  /api/users/me/           → {id, username, email, first_name, last_name, role, date_joined}
 *   GET/POST /api/accounts/
 *   GET /api/accounts/{id}/
 *   GET /api/accounts/{id}/balance/
 *   GET /api/accounts/{id}/statement/
 *   POST /api/transactions/deposit/    {account_id, amount, currency} + Idempotency-Key header
 *   POST /api/transactions/withdraw/   {account_id, amount, currency} + Idempotency-Key header
 *   POST /api/transactions/transfer/   {source_account_id, destination_account_id, amount, currency} + Idempotency-Key header
 *   GET  /api/transactions/
 *   GET  /api/transactions/{id}/
 *   Pagination: ?page=N (page_size=20)
 *
 * ERROR NORMALIZATION:
 *   All errors are caught and re-thrown as ApiError objects with:
 *     - message: human-readable error message (safe to display)
 *     - status: HTTP status code
 *     - data: response body (if available)
 *   Internal exception details are never exposed to callers.
 */

import axios from 'axios'

import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from './tokenStorage'

// ── API base URL ────────────────────────────────────────────────────────────
// Read from Vite environment variable. No hardcoded production URLs.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

// ── Create the Axios instance ───────────────────────────────────────────────

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor: attach JWT ─────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Token refresh state ─────────────────────────────────────────────────────
// When a 401 is received, we attempt a refresh. Multiple concurrent 401s
// should not each trigger separate refresh calls — they all wait for the
// single in-flight refresh to complete, then retry with the new token.

let isRefreshing = false
let failedQueue = []

/**
 * Process the queue of requests that were waiting for the refresh to complete.
 * If the refresh succeeded, retry each request with the new token.
 * If the refresh failed, reject all queued requests.
 */
function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token)
    }
  })
  failedQueue = []
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns a promise that resolves with the new access token or rejects.
 *
 * IMPORTANT: This function bypasses the interceptor-based api instance to
 * avoid infinite recursion — it uses a raw axios call with no interceptors.
 */
async function attemptTokenRefresh() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }

  const response = await axios.post(
    `${BASE_URL}/api/auth/token/refresh/`,
    { refresh: refreshToken },
    { headers: { 'Content-Type': 'application/json' }, timeout: 10000 }
  )

  // Backend with ROTATE_REFRESH_TOKENS=True returns both new tokens.
  const { access, refresh } = response.data
  setTokens(access, refresh)

  return access
}

// ── Response interceptor: error normalization + 401 refresh ─────────────────

api.interceptors.response.use(
  // Success — pass through
  (response) => response,

  // Error handler
  async (error) => {
    const originalRequest = error.config

    // ── Network error / timeout ─────────────────────────────────────────
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          'Unable to reach the server. Please check your connection and try again.',
          0,
          null
        )
      )
    }

    const { status, data } = error.response

    // ── 401 Unauthorized — attempt token refresh ────────────────────────
    // Only attempt refresh if:
    //   1. This is NOT the refresh endpoint itself (avoid recursion)
    //   2. This is NOT the login endpoint (bad credentials return 401)
    //   3. We haven't already retried this request (_retry flag)
    //   4. We have a refresh token
    const isRefreshCall = originalRequest.url?.includes('/auth/token/refresh/')
    const isLoginCall = originalRequest.url?.includes('/auth/token/')
    const alreadyRetried = originalRequest._retry

    if (status === 401 && !isRefreshCall && !isLoginCall && !alreadyRetried) {
      // If a refresh is already in flight, queue this request to wait.
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            // Retry the original request with the new token.
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            originalRequest._retry = true
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      // Start a refresh.
      isRefreshing = true
      originalRequest._retry = true

      try {
        const newToken = await attemptTokenRefresh()
        processQueue(null, newToken)

        // Retry the original request with the new token.
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh failed — session is over. Clear tokens and reject.
        processQueue(refreshError, null)
        clearTokens()

        // Emit a global event so the AuthContext can redirect to login.
        window.dispatchEvent(new CustomEvent('monvex:session-expired'))

        return Promise.reject(
          new ApiError(
            'Your session has expired. Please sign in again.',
            401,
            null
          )
        )
      } finally {
        isRefreshing = false
      }
    }

    // ── Normalize all other errors ──────────────────────────────────────
    const message =
      data?.error ||
      data?.detail ||
      data?.message ||
      getDefaultMessage(status)

    return Promise.reject(new ApiError(message, status, data))
  }
)

/**
 * Get a default error message for a given HTTP status code.
 */
function getDefaultMessage(status) {
  switch (status) {
    case 400:
      return 'The request was invalid. Please check your input and try again.'
    case 401:
      return 'You are not authorized. Please sign in.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return 'A conflict occurred with the current state of the resource.'
    case 422:
      return 'The request could not be processed due to validation errors.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'An unexpected server error occurred. Please try again.'
    case 502:
    case 503:
      return 'The server is temporarily unavailable. Please try again shortly.'
    default:
      return 'An error occurred while processing your request.'
  }
}

// ── ApiError class ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// ── API methods ─────────────────────────────────────────────────────────────

export const apiClient = {
  /**
   * Authentication endpoints
   */
  auth: {
    /**
     * POST /api/auth/token/
     * @param {string} username
     * @param {string} password
     * @returns {Promise<{access: string, refresh: string}>}
     */
    async login(username, password) {
      const { data } = await api.post('/api/auth/token/', { username, password })
      setTokens(data.access, data.refresh)
      return data
    },

    /**
     * POST /api/auth/register/
     * @param {{username: string, email: string, password: string, first_name?: string, last_name?: string}} payload
     * @returns {Promise<object>} user object
     */
    async register(payload) {
      const { data } = await api.post('/api/auth/register/', payload)
      return data
    },

    /**
     * POST /api/auth/token/refresh/
     * Explicit refresh — typically called by the interceptor, not directly.
     * @returns {Promise<{access: string, refresh: string}>}
     */
    async refresh() {
      const refreshToken = getRefreshToken()
      const { data } = await api.post('/api/auth/token/refresh/', {
        refresh: refreshToken,
      })
      setTokens(data.access, data.refresh)
      return data
    },

    /**
     * Logout: clear tokens from local storage.
     */
    logout() {
      clearTokens()
    },
  },

  /**
   * User profile
   */
  users: {
    /**
     * GET /api/users/me/
     * @returns {Promise<{id: string, username: string, email: string, first_name: string, last_name: string, role: string, date_joined: string}>}
     */
    async me() {
      const { data } = await api.get('/api/users/me/')
      return data
    },
  },

  /**
   * Account endpoints
   */
  accounts: {
    /**
     * GET /api/accounts/
     * @param {{page?: number}} params
     * @returns {Promise<object>} paginated list
     */
    async list(params = {}) {
      const { data } = await api.get('/api/accounts/', { params })
      return data
    },

    /**
     * POST /api/accounts/
     * @param {{account_type: string, name: string, currency?: string}} payload
     * @returns {Promise<object>} created account
     */
    async create(payload) {
      const { data } = await api.post('/api/accounts/', payload)
      return data
    },

    /**
     * GET /api/accounts/{id}/
     * @param {string} id — UUID
     * @returns {Promise<object>}
     */
    async get(id) {
      const { data } = await api.get(`/api/accounts/${id}/`)
      return data
    },

    /**
     * GET /api/accounts/{id}/balance/
     * @param {string} id
     * @returns {Promise<object>}
     */
    async getBalance(id) {
      const { data } = await api.get(`/api/accounts/${id}/balance/`)
      return data
    },

    /**
     * GET /api/accounts/{id}/statement/
     * @param {string} id
     * @param {{page?: number}} params
     * @returns {Promise<object>} paginated ledger entries
     */
    async getStatement(id, params = {}) {
      const { data } = await api.get(`/api/accounts/${id}/statement/`, { params })
      return data
    },
  },

  /**
   * Transaction endpoints
   * All money-moving endpoints require an Idempotency-Key header.
   */
  transactions: {
    /**
     * POST /api/transactions/deposit/
     * @param {{account_id: string, amount: string, currency?: string}} payload
     * @param {string} idempotencyKey — UUID
     * @returns {Promise<object>} created transaction
     */
    async deposit(payload, idempotencyKey) {
      const { data } = await api.post('/api/transactions/deposit/', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      return data
    },

    /**
     * POST /api/transactions/withdraw/
     * @param {{account_id: string, amount: string, currency?: string}} payload
     * @param {string} idempotencyKey — UUID
     * @returns {Promise<object>} created transaction
     */
    async withdraw(payload, idempotencyKey) {
      const { data } = await api.post('/api/transactions/withdraw/', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      return data
    },

    /**
     * POST /api/transactions/transfer/
     * @param {{source_account_id: string, destination_account_id: string, amount: string, currency?: string}} payload
     * @param {string} idempotencyKey — UUID
     * @returns {Promise<object>} created transaction
     */
    async transfer(payload, idempotencyKey) {
      const { data } = await api.post('/api/transactions/transfer/', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
      return data
    },

    /**
     * GET /api/transactions/
     * @param {{page?: number}} params
     * @returns {Promise<object>} paginated list
     */
    async list(params = {}) {
      const { data } = await api.get('/api/transactions/', { params })
      return data
    },

    /**
     * GET /api/transactions/{id}/
     * @param {string} id — UUID
     * @returns {Promise<object>}
     */
    async get(id) {
      const { data } = await api.get(`/api/transactions/${id}/`)
      return data
    },
  },
  /**
   * Audit endpoints — ADMIN and AUDITOR only.
   */
  audit: {
    /**
     * GET /api/audit/
     * @param {{page?: number, event_type?: string, actor?: string, resource_type?: string, created_at_after?: string, created_at_before?: string}} params
     * @returns {Promise<object>} paginated audit log entries
     */
    async list(params = {}) {
      const { data } = await api.get('/api/audit/', { params })
      return data
    },

    /**
     * GET /api/audit/{id}/
     * @param {string} id — UUID
     * @returns {Promise<object>}
     */
    async get(id) {
      const { data } = await api.get(`/api/audit/${id}/`)
      return data
    },
  },

  /**
   * Reconciliation endpoint — ADMIN and AUDITOR only.
   */
  reconciliation: {
    /**
     * GET /api/reconciliation/
     * Runs reconciliation and returns a report. Read-only.
     * @returns {Promise<object>} {has_discrepancies, balance_discrepancies, double_entry_violations, orphan_transactions}
     */
    async run() {
      const { data } = await api.get('/api/reconciliation/')
      return data
    },
  },

  /**
   * Admin user management — ADMIN and AUDITOR (role-restricted create).
   */
  admin: {
    users: {
      /**
       * GET /api/admin/users/
       * @param {{page?: number, search?: string, role?: string, is_active?: string}} params
       * @returns {Promise<object>} paginated user list
       */
      async list(params = {}) {
        const { data } = await api.get('/api/admin/users/', { params })
        return data
      },

      /**
       * GET /api/admin/users/{id}/
       * @param {string} id — UUID
       * @returns {Promise<object>}
       */
      async get(id) {
        const { data } = await api.get(`/api/admin/users/${id}/`)
        return data
      },

      /**
       * POST /api/admin/users/
       * Create a new user. ADMIN can create any role.
       * AUDITOR can create ACCOUNT_HOLDER and AUDITOR only.
       * @param {{username, email, password, role, first_name?, last_name?, is_active?}} payload
       * @returns {Promise<object>} created user
       */
      async create(payload) {
        const { data } = await api.post('/api/admin/users/', payload)
        return data
      },

      /**
       * PATCH /api/admin/users/{id}/
       * Update role and/or is_active. ADMIN only.
       * @param {string} id
       * @param {{role?: string, is_active?: boolean, first_name?: string, last_name?: string}} payload
       * @returns {Promise<object>} updated user
       */
      async update(id, payload) {
        const { data } = await api.patch(`/api/admin/users/${id}/`, payload)
        return data
      },
    },
  },
}

export default api

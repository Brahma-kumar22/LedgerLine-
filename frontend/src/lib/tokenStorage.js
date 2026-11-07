/**
 * lib/tokenStorage.js
 *
 * Centralized JWT token storage.
 *
 * Tokens are stored in localStorage for persistence across browser sessions.
 * On logout or refresh failure, both tokens are cleared and the user is
 * redirected to the login page.
 *
 * SECURITY NOTES:
 *   - We store the access token in localStorage. This is a trade-off:
 *     localStorage is accessible to any JS running on the same origin,
 *     which means XSS attacks could read tokens. HttpOnly cookies would
 *     be more secure but require backend changes. For this project, we
 *     use localStorage with the understanding that the backend is the
 *     security boundary — frontend token storage is a convenience, not
 *     a security control.
 *   - We NEVER store the user's password, even briefly.
 *   - The refresh token has a 7-day lifetime on the backend side.
 *
 * TOKEN ROTATION:
 *   The backend has ROTATE_REFRESH_TOKENS=True, meaning each call to
 *   /api/auth/token/refresh/ returns a NEW refresh token AND a new access
 *   token. We must store the new refresh token after every refresh call
 *   and discard the old one.
 */

const ACCESS_TOKEN_KEY = 'monvex_access_token'
const REFRESH_TOKEN_KEY = 'monvex_refresh_token'

/**
 * Read the current access token from storage.
 * @returns {string|null}
 */
export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

/**
 * Read the current refresh token from storage.
 * @returns {string|null}
 */
export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/**
 * Store both tokens after login or refresh.
 * @param {string} access
 * @param {string} refresh
 */
export function setTokens(access, refresh) {
  if (access) localStorage.setItem(ACCESS_TOKEN_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
}

/**
 * Remove both tokens from storage.
 * Called on logout or when refresh fails (session expired).
 */
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

/**
 * Check if we have any tokens (for initial session restoration check).
 * @returns {boolean}
 */
export function hasTokens() {
  return !!getAccessToken() && !!getRefreshToken()
}

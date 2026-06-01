/**
 * apiFetch — a thin wrapper around fetch() that:
 *  1. Prepends VITE_API_URL to all relative paths
 *  2. Automatically redirects to /login on 401 (expired/invalid token)
 *  3. Clears localStorage on logout
 */

const rawApiUrl = import.meta.env.VITE_API_URL || '';
export const API_BASE =
  rawApiUrl && !/^https?:\/\//i.test(rawApiUrl) ? `https://${rawApiUrl}` : rawApiUrl;

function clearAuthAndRedirect() {
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('userEmail');
  // Only redirect if not already on the login page
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // On 401: if we're already on the login page (e.g., bad credentials) just
  // return the response so the caller can show an error message.
  // If we're on any other page, clear auth and redirect to login.
  if (response.status === 401) {
    if (window.location.pathname.includes('/login')) {
      return response; // Let the login page handle it normally
    }
    clearAuthAndRedirect();
    // Throw so any awaiting caller doesn't continue with a stale response
    throw new Error('Session expired. Please log in again.');
  }

  return response;
}

/** Convenience: headers-only object (for multipart forms where you cannot set Content-Type) */
export function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

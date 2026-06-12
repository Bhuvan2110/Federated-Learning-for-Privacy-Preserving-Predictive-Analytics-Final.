const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

let _token = null

export function setAuthToken(token) {
  _token = token
}

export function getAuthToken() {
  return _token
}

// Ping the backend to wake it from Render free-tier sleep
export async function wakeBackend() {
  try {
    await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(60000) })
  } catch (_) {
    // ignore — we just want to wake it
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out — backend may be waking up, please retry in a moment')
    }
    // TypeError: Failed to fetch  →  nicer message
    throw new Error('Cannot reach server — check your connection or wait for the backend to wake up')
  } finally {
    clearTimeout(timer)
  }
}

export async function apiFetch(path, options = {}, retries = 1) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}${path}`, { ...options, headers })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || `API error ${res.status}`)
      }
      return await res.json()
    } catch (err) {
      // On the last attempt, or if it's an API error (not a network error), throw
      const isNetworkError = err.message.includes('waking') || err.message.includes('Cannot reach')
      if (attempt === retries || !isNetworkError) throw err
      // Wait 3s then retry (gives backend time to wake)
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

export async function apiUpload(path, formData, retries = 1) {
  const headers = {}
  if (_token) headers['Authorization'] = `Bearer ${_token}`

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${API_BASE}${path}`,
        { method: 'POST', headers, body: formData },
        60000 // uploads can take longer
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || `Upload error ${res.status}`)
      }
      return await res.json()
    } catch (err) {
      const isNetworkError = err.message.includes('waking') || err.message.includes('Cannot reach')
      if (attempt === retries || !isNetworkError) throw err
      await new Promise(r => setTimeout(r, 3000))
    }
  }
}

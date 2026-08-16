const PRIMARY_BASE_URL = '/api'

function getFallbackBaseUrl() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:'
    const hostname = window.location.hostname || 'localhost'
    return `${protocol}//${hostname}:5008/api`
  }
  return 'http://localhost:5000/api'
}

function getAuthToken(isAdmin = false) {
  return localStorage.getItem(isAdmin ? 'chocodor_admin_token' : 'chocodor_cust_token')
}

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, isAdmin = false, headers = {} } = options

  const token = getAuthToken(isAdmin)
  const reqHeaders = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`
  }

  const config = {
    method,
    headers: reqHeaders,
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  // 1. Try Primary Nginx Proxy Endpoint (/api/...)
  try {
    const res = await fetch(`${PRIMARY_BASE_URL}${endpoint}`, config)
    if (res.ok) {
      return await res.json().catch(() => ({}))
    }

    // Parse backend JSON error message if available
    const data = await res.json().catch(() => ({}))

    // 2. If Nginx returned 502/503/504 gateway error or 404 (proxy misrouting), retry on exposed backend port with 3s timeout
    if (res.status === 404 || res.status >= 500) {
      try {
        const fallbackUrl = getFallbackBaseUrl()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const fallbackRes = await fetch(`${fallbackUrl}${endpoint}`, {
          ...config,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const fallbackData = await fallbackRes.json().catch(() => ({}))
        if (fallbackRes.ok) {
          return fallbackData
        }
        throw new Error(fallbackData.error || data.error || `Request failed with status ${fallbackRes.status}`)
      } catch (fallbackErr) {
        // If fallback failed or timed out, report backend error or primary response error
        throw new Error(data.error || fallbackErr.message || `Request failed with status ${res.status}`)
      }
    }

    throw new Error(data.error || `Request failed with status ${res.status}`)
  } catch (err) {
    // If initial fetch connection threw network error, attempt direct backend fallback with 3s timeout
    if (!err.message || (!err.message.includes('status') && !err.message.includes('Invalid') && !err.message.includes('already exists'))) {
      try {
        const fallbackUrl = getFallbackBaseUrl()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)

        const fallbackRes = await fetch(`${fallbackUrl}${endpoint}`, {
          ...config,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        const fallbackData = await fallbackRes.json().catch(() => ({}))
        if (fallbackRes.ok) {
          return fallbackData
        }
        throw new Error(fallbackData.error || `Request failed with status ${fallbackRes.status}`)
      } catch {
        throw err
      }
    }
    throw err
  }
}

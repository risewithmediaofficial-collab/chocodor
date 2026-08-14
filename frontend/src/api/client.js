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

    // 2. If Nginx returned 404 or gateway error, seamlessly retry on exposed Backend Port (:5008)
    if (res.status === 404 || res.status >= 500) {
      const fallbackUrl = getFallbackBaseUrl()
      const fallbackRes = await fetch(`${fallbackUrl}${endpoint}`, config)
      const fallbackData = await fallbackRes.json().catch(() => ({}))
      if (fallbackRes.ok) {
        return fallbackData
      }
      throw new Error(fallbackData.error || `Request failed with status ${fallbackRes.status}`)
    }

    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Request failed with status ${res.status}`)
  } catch (err) {
    // If initial fetch connection threw network error, attempt direct backend fallback
    if (!err.message || !err.message.includes('status')) {
      try {
        const fallbackUrl = getFallbackBaseUrl()
        const fallbackRes = await fetch(`${fallbackUrl}${endpoint}`, config)
        const fallbackData = await fallbackRes.json().catch(() => ({}))
        if (fallbackRes.ok) {
          return fallbackData
        }
        throw new Error(fallbackData.error || `Request failed with status ${fallbackRes.status}`)
      } catch (fallbackErr) {
        throw new Error(fallbackErr.message || err.message)
      }
    }
    throw err
  }
}

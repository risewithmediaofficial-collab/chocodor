const PRIMARY_BASE_URL = '/api'

function getFallbackBaseUrl() {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol || 'http:'
    const hostname = window.location.hostname || 'localhost'
    return `${protocol}//${hostname}:5008/api`
  }
  return 'http://localhost:5008/api'
}

function getAuthToken(isAdmin = false) {
  return localStorage.getItem(isAdmin ? 'chocodor_admin_token' : 'chocodor_cust_token')
}

function handleUnauthorized(isAdmin, errorMsg) {
  if (typeof window === 'undefined') return

  if (isAdmin) {
    localStorage.removeItem('chocodor_admin_token')
    localStorage.removeItem('chocodor_admin_user')
    window.dispatchEvent(new CustomEvent('chocodor:admin-session-expired', { detail: { message: errorMsg } }))
    // If currently browsing inside the admin panel (except login), cleanly redirect to login with notification
    if (window.location.pathname.startsWith('/admin') && !window.location.pathname.includes('/admin/login')) {
      window.location.replace('/admin/login?expired=1')
    }
  } else {
    localStorage.removeItem('chocodor_cust_token')
    localStorage.removeItem('chocodor_cust_user')
    window.dispatchEvent(new CustomEvent('chocodor:customer-session-expired', { detail: { message: errorMsg } }))
  }
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

    // Handle 401 Unauthorized explicitly
    if (res.status === 401) {
      handleUnauthorized(isAdmin, data.error)
      throw new Error(data.error || 'Invalid or expired session')
    }

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

        if (fallbackRes.status === 401) {
          handleUnauthorized(isAdmin, fallbackData.error)
          throw new Error(fallbackData.error || 'Invalid or expired session')
        }

        throw new Error(fallbackData.error || data.error || `Request failed with status ${fallbackRes.status}`)
      } catch (fallbackErr) {
        // If fallback failed or timed out, report backend error or primary response error
        throw new Error(data.error || fallbackErr.message || `Request failed with status ${res.status}`)
      }
    }

    throw new Error(data.error || `Request failed with status ${res.status}`)
  } catch (err) {
    // If it's an unauthorized or invalid session error, bubble up immediately
    if (err.message && (err.message.includes('expired') || err.message.includes('session') || err.message.includes('Admin authentication') || err.message.includes('401'))) {
      throw err
    }

    // If initial fetch connection threw network error, attempt direct backend fallback with 3s timeout
    if (!err.message || (!err.message.includes('status') && !err.message.includes('already exists'))) {
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

        if (fallbackRes.status === 401) {
          handleUnauthorized(isAdmin, fallbackData.error)
          throw new Error(fallbackData.error || 'Invalid or expired session')
        }

        throw new Error(fallbackData.error || `Request failed with status ${fallbackRes.status}`)
      } catch {
        throw err
      }
    }
    throw err
  }
}

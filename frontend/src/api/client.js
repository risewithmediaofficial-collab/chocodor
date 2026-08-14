const BASE_URL = '/api'

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

  const res = await fetch(`${BASE_URL}${endpoint}`, config)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`)
  }

  return data
}

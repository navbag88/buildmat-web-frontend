import api from './api'

// User metadata is stored in localStorage for UI purposes only (role-based routing, display name).
// The actual authentication credential is the HTTP-only session cookie, which the browser
// manages automatically and JavaScript cannot read.  A user who copies localStorage data
// to another browser still cannot authenticate — they have no session cookie.

export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}

export const isSuperAdmin = () => getUser()?.role === 'SUPER_ADMIN'
export const isAdmin      = () => ['ADMIN', 'SUPER_ADMIN'].includes(getUser()?.role)

export const logout = async () => {
  try {
    // Tell the server to invalidate the session and clear the cookie.
    await api.post('/auth/logout')
  } catch {
    // Continue logout even if the server call fails (session may already be gone).
  } finally {
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
}

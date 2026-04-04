export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}
export const getToken = () => localStorage.getItem('token')
export const isSuperAdmin = () => getUser()?.role === 'SUPER_ADMIN'
export const isAdmin = () => ['ADMIN', 'SUPER_ADMIN'].includes(getUser()?.role)
export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

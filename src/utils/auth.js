export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
}
export const getToken = () => localStorage.getItem('token')
export const isAdmin = () => getUser()?.role === 'ADMIN'
export const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  window.location.href = '/login'
}

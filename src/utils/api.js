import axios from 'axios'

const api = axios.create({ baseURL: 'http://159.65.152.128:8080/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Helpers ────────────────────────────────────────────────────────
export const INR = v => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(v ?? 0)

export const inr = INR

export const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN') : '—'

export function downloadBlob(data, filename) {
  const url = URL.createObjectURL(new Blob([data]))
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ── Dashboard ──────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
}

// ── Customers ──────────────────────────────────────────────────────
export const customersApi = {
  getAll:          (q) => api.get('/customers', { params: q ? { q } : {} }),
  getById:         (id) => api.get(`/customers/${id}`),
  create:          (data) => api.post('/customers', data),
  update:          (id, data) => api.put(`/customers/${id}`, data),
  delete:          (id) => api.delete(`/customers/${id}`),
  import:          (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/customers/import', fd) },
  importTemplate:  () => api.get('/customers/import/template', { responseType: 'blob' }),
  exportExcel:     () => api.get('/customers/export/excel', { responseType: 'blob' }),
  exportPdf:       () => api.get('/customers/export/pdf', { responseType: 'blob' }),
}

// ── Products ───────────────────────────────────────────────────────
export const productsApi = {
  getAll:          (q) => api.get('/products', { params: q ? { q } : {} }),
  getById:         (id) => api.get(`/products/${id}`),
  create:          (data) => api.post('/products', data),
  update:          (id, data) => api.put(`/products/${id}`, data),
  delete:          (id) => api.delete(`/products/${id}`),
  import:          (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/products/import', fd) },
  importTemplate:  () => api.get('/products/import/template', { responseType: 'blob' }),
  exportExcel:     () => api.get('/products/export/excel', { responseType: 'blob' }),
  exportPdf:       () => api.get('/products/export/pdf', { responseType: 'blob' }),
}

// ── Invoices ───────────────────────────────────────────────────────
export const invoicesApi = {
  getAll:      (q) => api.get('/invoices', { params: q ? { q } : {} }),
  getById:     (id) => api.get(`/invoices/${id}`),
  create:      (data) => api.post('/invoices', data),
  update:      (id, data) => api.put(`/invoices/${id}`, data),
  delete:      (id) => api.delete(`/invoices/${id}`),
  getPdf:      (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  exportExcel: () => api.get('/invoices/export/excel', { responseType: 'blob' }),
  exportPdf:   () => api.get('/invoices/export/pdf', { responseType: 'blob' }),
}

// ── Payments ───────────────────────────────────────────────────────
export const paymentsApi = {
  getAll:      () => api.get('/payments'),
  byInvoice:   (invoiceId) => api.get(`/payments/invoice/${invoiceId}`),
  create:      (data) => api.post('/payments', data),
  delete:      (id) => api.delete(`/payments/${id}`),
  exportExcel: () => api.get('/payments/export/excel', { responseType: 'blob' }),
  exportPdf:   () => api.get('/payments/export/pdf', { responseType: 'blob' }),
}

// ── Reports ────────────────────────────────────────────────────────
export const reportsApi = {
  salesSummary:      (from, to) => api.get('/reports/sales-summary', { params: { from, to } }),
  outstanding:       (asOf) => api.get('/reports/outstanding', { params: { asOf } }),
  customerSales:     (from, to) => api.get('/reports/customer-sales', { params: { from, to } }),
  productSales:      (from, to) => api.get('/reports/product-sales', { params: { from, to } }),
  gst:               (from, to) => api.get('/reports/gst', { params: { from, to } }),
  paymentCollection: (from, to) => api.get('/reports/payment-collection', { params: { from, to } }),
  exportExcel:       (type, params) => api.get(`/reports/${type}/export/excel`, { params, responseType: 'blob' }),
  exportPdf:         (type, params) => api.get(`/reports/${type}/export/pdf`, { params, responseType: 'blob' }),
}

// ── Settings ───────────────────────────────────────────────────────
export const settingsApi = {
  get:        () => api.get('/settings'),
  update:     (data) => api.put('/settings', data),
  uploadLogo: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/settings/logo', fd) },
  removeLogo: () => api.delete('/settings/logo'),
  getLogo:    () => api.get('/settings/logo', { responseType: 'blob' }),
}

// ── Users ──────────────────────────────────────────────────────────
export const usersApi = {
  getAll:         () => api.get('/users'),
  create:         (data) => api.post('/users', data),
  update:         (id, data) => api.put(`/users/${id}`, data),
  delete:         (id) => api.delete(`/users/${id}`),
  changePassword: (id, password) => api.put(`/users/${id}/password`, { password }),
}

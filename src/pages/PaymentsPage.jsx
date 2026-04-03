// ══ All imports ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { paymentsApi, reportsApi, usersApi, INR, downloadBlob } from '../utils/api.js'
import { useAuth } from '../App.jsx'
import { ExportButtons, DataTable, Spinner, useConfirm, Modal, Field, StatusBadge } from '../components/Shared.jsx'

// ══ PaymentsPage ══════════════════════════════════════════════════════════════
export function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const confirm = useConfirm()

  const load = async () => {
    setLoading(true)
    try { const r = await paymentsApi.getAll(); setPayments(r.data) }
    catch { toast.error('Failed to load payments') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (p) => {
    if (!confirm(`Delete payment of ${INR(p.amount)}?`)) return
    try { await paymentsApi.delete(p.id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const methodBadge = (m) => {
    const cls = { CASH:'bg-green-100 text-green-700', CHEQUE:'bg-blue-100 text-blue-700', 'NEFT/RTGS':'bg-purple-100 text-purple-700', UPI:'bg-indigo-100 text-indigo-700', CARD:'bg-orange-100 text-orange-700' }
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls[m]||'bg-gray-100 text-gray-600'}`}>{m}</span>
  }

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="page-title">Payments</h1>
        <ExportButtons onExcelExport={paymentsApi.exportExcel} onPdfExport={paymentsApi.exportPdf} />
      </div>
      {loading ? <Spinner /> : (
        <DataTable headers={['Date','Invoice #','Customer','Amount','Method','Reference','Actions']} empty={payments.length===0}>
          {payments.map(p => (
            <tr key={p.id} className="table-tr">
              <td className="table-td text-gray-500">{p.paymentDate}</td>
              <td className="table-td font-medium text-blue-600">{p.invoiceNumber}</td>
              <td className="table-td">{p.customerName||'—'}</td>
              <td className="table-td text-right font-semibold text-green-700">{INR(p.amount)}</td>
              <td className="table-td">{methodBadge(p.method)}</td>
              <td className="table-td text-gray-500">{p.reference||'—'}</td>
              <td className="table-td">
                <button className="btn-danger btn-sm" onClick={() => handleDelete(p)}>Delete</button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  )
}

export default PaymentsPage

// ══ ReportsPage ═══════════════════════════════════════════════════════════════
const REPORTS = [
  { id: 'sales-summary',      label: '📈 Sales Summary',             needsDates: true },
  { id: 'outstanding',        label: '⚠️ Outstanding Invoices',       needsAsOf: true },
  { id: 'customer-sales',     label: '👥 Customer-wise Sales',        needsDates: true },
  { id: 'product-sales',      label: '📦 Product-wise Sales',         needsDates: true },
  { id: 'gst',                label: '🧾 GST Report (SGST/CGST)',     needsDates: true },
  { id: 'payment-collection', label: '💰 Payment Collection',         needsDates: true },
]

function ReportsPage() {
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const [report, setReport]   = useState(REPORTS[0])
  const [from, setFrom]       = useState(firstOfMonth)
  const [to, setTo]           = useState(today)
  const [asOf, setAsOf]       = useState(today)
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState('')

  const quickRange = (type) => {
    const now = new Date()
    if (type === 'this-month') { setFrom(new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0]); setTo(today) }
    if (type === 'last-month') {
      const fm = new Date(now.getFullYear(),now.getMonth()-1,1); const lm = new Date(now.getFullYear(),now.getMonth(),0)
      setFrom(fm.toISOString().split('T')[0]); setTo(lm.toISOString().split('T')[0])
    }
    if (type === 'this-year') { setFrom(`${now.getFullYear()}-01-01`); setTo(today) }
  }

  const runReport = async () => {
    setLoading(true); setData(null)
    try {
      let r
      if (report.id === 'sales-summary')      r = await reportsApi.salesSummary(from, to)
      else if (report.id === 'outstanding')    r = await reportsApi.outstanding(asOf)
      else if (report.id === 'customer-sales') r = await reportsApi.customerSales(from, to)
      else if (report.id === 'product-sales')  r = await reportsApi.productSales(from, to)
      else if (report.id === 'gst')            r = await reportsApi.gst(from, to)
      else if (report.id === 'payment-collection') r = await reportsApi.paymentCollection(from, to)
      setData(r.data)
    } catch { toast.error('Report failed') }
    finally { setLoading(false) }
  }

  const exportReport = async (type) => {
    setExporting(type)
    try {
      const params = report.needsAsOf ? { asOf } : { from, to }
      const r = type === 'excel' ? await reportsApi.exportExcel(report.id, params) : await reportsApi.exportPdf(report.id, params)
      downloadBlob(r.data, `${report.id}.${type === 'excel' ? 'xlsx' : 'pdf'}`)
      toast.success(`${type.toUpperCase()} exported!`)
    } catch { toast.error('Export failed') }
    finally { setExporting('') }
  }

  const rows = data ? (Array.isArray(data) ? data : data.rows || data.monthly || []) : []
  const cols = rows.length > 0 ? Object.keys(rows[0]) : []

  return (
    <div className="space-y-6">
      <h1 className="page-title">MIS Reports</h1>

      <div className="card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select className="input" value={report.id} onChange={e => setReport(REPORTS.find(r => r.id===e.target.value))}>
              {REPORTS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          {report.needsDates && <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
            </div>
          </>}
          {report.needsAsOf && <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">As of Date</label>
            <input className="input" type="date" value={asOf} onChange={e => setAsOf(e.target.value)} />
          </div>}
        </div>

        {report.needsDates && (
          <div className="flex gap-2 flex-wrap">
            {[{id:'this-month',label:'This Month'},{id:'last-month',label:'Last Month'},{id:'this-year',label:'This Year'}].map(q => (
              <button key={q.id} onClick={() => quickRange(q.id)} className="btn-secondary btn-sm">{q.label}</button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={runReport} disabled={loading} className="btn-primary">
            {loading ? 'Loading...' : '👁 View Report'}
          </button>
          {data && <>
            <button onClick={() => exportReport('excel')} disabled={!!exporting} className="btn-secondary btn-sm">
              📊 {exporting==='excel' ? '...' : 'Download Excel'}
            </button>
            <button onClick={() => exportReport('pdf')} disabled={!!exporting} className="btn-secondary btn-sm text-red-600">
              📄 {exporting==='pdf' ? '...' : 'Download PDF'}
            </button>
          </>}
        </div>
      </div>

      {data && rows.length === 0 && <div className="card p-8 text-center text-gray-400">No data found for selected period.</div>}
      {data && rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-blue-700">
                <tr>{cols.map(c => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase tracking-wide">{c.replace(/_/g,' ')}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i%2===0?'bg-blue-50':'bg-white'}>
                    {cols.map(c => {
                      const v = row[c]
                      const isAmt = ['subtotal','sgst','cgst','total_gst','total_amount','paid_amount','outstanding','gst_amount','balance_due','taxable_value','sgst_amount','cgst_amount','total_with_gst','total_sales','gst_collected','avg_price','amount'].includes(c)
                      return <td key={c} className={`px-4 py-2.5 text-sm ${isAmt?'text-right font-medium':''}`}>
                        {v == null ? '—' : isAmt ? INR(v) : v.toString()}
                      </td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GST report has two tables */}
      {data && data.byProduct && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b font-semibold text-gray-700">GST by Product</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-purple-700">
                <tr>{Object.keys(data.byProduct[0]||{}).map(c => <th key={c} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">{c.replace(/_/g,' ')}</th>)}</tr>
              </thead>
              <tbody>
                {data.byProduct.map((row, i) => (
                  <tr key={i} className={i%2===0?'bg-purple-50':'bg-white'}>
                    {Object.entries(row).map(([k,v]) => <td key={k} className="px-4 py-2.5 text-sm">{v==null?'—':v.toString()}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export { ReportsPage }

// ══ UsersPage ═════════════════════════════════════════════════════════════════
function UsersPage() {
  const { isAdmin } = useAuth()
  const [users, setUsers]   = useState([])
  const [modal, setModal]   = useState(null)
  const [pwdModal, setPwdModal] = useState(null)
  const confirm = useConfirm()

  const load = async () => {
    try { const r = await usersApi.getAll(); setUsers(r.data) }
    catch { toast.error('Failed to load users') }
  }

  useEffect(() => { load() }, [])

  if (!isAdmin) return <div className="card p-8 text-center text-gray-500">Admin access required.</div>

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.username}"?`)) return
    try { await usersApi.delete(u.id); toast.success('Deleted'); load() }
    catch { toast.error('Cannot delete — may have dependencies') }
  }

  return (
    <div className="space-y-6">
      <div className="section-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Admin only — manage who can access BuildMat Billing</p>
        </div>
        <button className="btn-primary" onClick={() => setModal({})}>+ Add User</button>
      </div>

      <DataTable headers={['Username','Full Name','Role','Status','Actions']} empty={users.length===0}>
        {users.map(u => (
          <tr key={u.id} className="table-tr">
            <td className="table-td font-mono font-medium">{u.username}</td>
            <td className="table-td">{u.fullName}</td>
            <td className="table-td"><StatusBadge status={u.role} /></td>
            <td className="table-td"><StatusBadge status={u.active ? 'Active' : 'Inactive'} /></td>
            <td className="table-td">
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" onClick={() => setModal(u)}>Edit</button>
                <button className="btn-secondary btn-sm text-amber-600" onClick={() => setPwdModal(u)}>Password</button>
                <button className="btn-danger btn-sm" onClick={() => handleDelete(u)}>Delete</button>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>

      {modal !== null && <UserModal user={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      {pwdModal && <PwdModal user={pwdModal} onClose={() => setPwdModal(null)} onSaved={() => { setPwdModal(null); toast.success('Password changed!') }} />}
    </div>
  )
}

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user.id
  const [form, setForm] = useState({ username: user.username||'', fullName: user.fullName||'', role: user.role||'USER', active: user.active!==false, password: '' })
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) return toast.error('Full name required')
    if (!isEdit && !form.password) return toast.error('Password required')
    setSaving(true)
    try {
      isEdit ? await usersApi.update(user.id, form) : await usersApi.create(form)
      toast.success(isEdit ? 'User updated!' : 'User created!')
      onSaved()
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? `Edit — ${user.username}` : 'Add User'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" required><input className="input" value={form.fullName} onChange={e => set('fullName',e.target.value)} required /></Field>
          <Field label="Username" required>
            <input className={`input ${isEdit?'bg-gray-100':''}`} value={form.username} onChange={e => set('username',e.target.value)} disabled={isEdit} required />
          </Field>
          {!isEdit && <Field label="Password" required><input className="input" type="password" value={form.password} onChange={e => set('password',e.target.value)} required /></Field>}
          <Field label="Role">
            <select className="input" value={form.role} onChange={e => set('role',e.target.value)}>
              <option value="USER">USER</option><option value="ADMIN">ADMIN</option>
            </select>
          </Field>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="active" checked={form.active} onChange={e => set('active',e.target.checked)} className="w-4 h-4" />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving?'Saving...':'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

function PwdModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 4) return toast.error('Min 4 characters')
    if (form.password !== form.confirm) return toast.error('Passwords do not match')
    setSaving(true)
    try { await usersApi.changePassword(user.id, form.password); onSaved() }
    catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Change Password — ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New Password" required><input className="input" type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required /></Field>
        <Field label="Confirm Password" required><input className="input" type="password" value={form.confirm} onChange={e => setForm(f=>({...f,confirm:e.target.value}))} required /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving?'Changing...':'Change Password'}</button>
        </div>
      </form>
    </Modal>
  )
}

export { UsersPage }

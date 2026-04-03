import React, { useRef } from 'react'
import { toast } from 'react-hot-toast'
import { downloadBlob } from '../utils/api.js'

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, size = '' }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Form Field ─────────────────────────────────────────────────────────────────
export function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

// ── Export Buttons ─────────────────────────────────────────────────────────────
export function ExportButtons({ onExcelExport, onPdfExport }) {
  const [loading, setLoading] = React.useState('')

  const handle = async (type, fn) => {
    setLoading(type)
    try {
      const res = await fn()
      downloadBlob(res.data, `export.${type}`)
      toast.success(`${type.toUpperCase()} exported!`)
    } catch { toast.error('Export failed') }
    finally { setLoading('') }
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => handle('xlsx', onExcelExport)} disabled={loading === 'xlsx'}
        className="btn-secondary btn-sm flex items-center gap-1.5">
        📊 {loading === 'xlsx' ? '...' : 'Excel'}
      </button>
      <button onClick={() => handle('pdf', onPdfExport)} disabled={loading === 'pdf'}
        className="btn-secondary btn-sm flex items-center gap-1.5 text-red-600 hover:bg-red-50">
        📄 {loading === 'pdf' ? '...' : 'PDF'}
      </button>
    </div>
  )
}

// ── Import Button ──────────────────────────────────────────────────────────────
export function ImportButton({ onImport }) {
  const ref = useRef()
  const [loading, setLoading] = React.useState(false)

  const handle = async (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setLoading(true)
    try {
      const res = await onImport(file)
      toast.success(`Imported ${res.data.imported} records!`)
      if (res.data.errors?.length) toast(res.data.errors.slice(0,3).join('\n'), { icon: '⚠️' })
    } catch { toast.error('Import failed') }
    finally { setLoading(false); ref.current.value = '' }
  }

  return (
    <>
      <button onClick={() => ref.current.click()} disabled={loading}
        className="btn-success btn-sm flex items-center gap-1.5">
        ⬆ {loading ? 'Importing...' : 'Import Excel'}
      </button>
      <input ref={ref} type="file" accept=".xlsx" className="hidden" onChange={handle} />
    </>
  )
}

// ── Search Bar ─────────────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      <input className="input pl-8 w-64" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

// ── Status Badge ───────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const cls = { PAID: 'badge-paid', PARTIAL: 'badge-partial', UNPAID: 'badge-unpaid',
                ADMIN: 'badge-admin', USER: 'badge-user', Active: 'badge-paid', Inactive: 'badge-unpaid' }
  return <span className={cls[status] || 'inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700'}>{status}</span>
}

// ── Confirm Dialog ─────────────────────────────────────────────────────────────
export function useConfirm() {
  const confirm = (message) => window.confirm(message)
  return confirm
}

// ── Empty State ────────────────────────────────────────────────────────────────
export function Empty({ message = 'No records found.' }) {
  return <div className="py-16 text-center text-gray-400">{message}</div>
}

// ── Loading Spinner ────────────────────────────────────────────────────────────
export function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
}

// ── Table wrapper ──────────────────────────────────────────────────────────────
export function DataTable({ headers, children, empty }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>{headers.map(h => <th key={h} className="table-th">{h}</th>)}</tr>
          </thead>
          <tbody>
            {children}
          </tbody>
        </table>
        {empty && <Empty />}
      </div>
    </div>
  )
}

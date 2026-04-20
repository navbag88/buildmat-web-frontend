import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { suppliersApi } from '../utils/api.js'
import { Modal, Field, ExportButtons, SearchBar, DataTable, Spinner, useConfirm } from '../components/Shared.jsx'
import { isSuperAdmin } from '../utils/auth.js'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null)   // null | 'new' | supplier obj
  const confirm = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await suppliersApi.getAll(search); setSuppliers(r.data) }
    catch { toast.error('Failed to load suppliers') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (sup) => {
    if (!confirm(`Delete supplier "${sup.name}"? This cannot be undone.`)) return
    try { await suppliersApi.delete(sup.id); toast.success('Supplier deleted'); load() }
    catch { toast.error('Delete failed — supplier may have linked purchases') }
  }

  return (
    <div className="space-y-6">
      <div className="section-header flex-wrap gap-3">
        <h1 className="page-title">Suppliers</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, phone..." />
          <ExportButtons onExcelExport={suppliersApi.exportExcel} onPdfExport={suppliersApi.exportPdf} />
          <button className="btn-primary" onClick={() => setModal('new')}>+ New Supplier</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <DataTable
          headers={['Name', 'Contact Person', 'Phone', 'Email', 'GSTIN', 'Address', 'Actions']}
          empty={suppliers.length === 0}
        >
          {suppliers.map(sup => (
            <tr key={sup.id} className="table-tr">
              <td className="table-td font-semibold text-blue-700">{sup.name}</td>
              <td className="table-td text-gray-600">{sup.contactPerson || '—'}</td>
              <td className="table-td">{sup.phone || '—'}</td>
              <td className="table-td text-gray-500">{sup.email || '—'}</td>
              <td className="table-td font-mono text-xs">{sup.gstin || '—'}</td>
              <td className="table-td text-gray-500 max-w-xs truncate">{sup.address || '—'}</td>
              <td className="table-td">
                <div className="flex gap-1.5">
                  <button className="btn-secondary btn-sm" onClick={() => setModal(sup)}>✏</button>
                  {isSuperAdmin() && (
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(sup)}>✕</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {modal !== null && (
        <SupplierModal
          supplier={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}

// ── Supplier Form Modal ────────────────────────────────────────────────────────
function SupplierModal({ supplier, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', gstin: '', contactPerson: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (supplier) setForm({
      name:          supplier.name          || '',
      phone:         supplier.phone         || '',
      email:         supplier.email         || '',
      address:       supplier.address       || '',
      gstin:         supplier.gstin         || '',
      contactPerson: supplier.contactPerson || '',
    })
  }, [supplier])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Supplier name is required')
    setSaving(true)
    try {
      supplier?.id
        ? await suppliersApi.update(supplier.id, form)
        : await suppliersApi.create(form)
      toast.success(supplier?.id ? 'Supplier updated!' : 'Supplier created!')
      onSaved()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={supplier?.id ? `Edit Supplier — ${supplier.name}` : 'New Supplier'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Supplier Name" required>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Company / individual name" />
          </Field>
          <Field label="Contact Person">
            <input className="input" value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} placeholder="Primary contact name" />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="supplier@example.com" />
          </Field>
          <Field label="GSTIN">
            <input className="input font-mono" value={form.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
          </Field>
        </div>
        <Field label="Address">
          <textarea className="input resize-none" rows={2} value={form.address} onChange={e => set('address', e.target.value)} placeholder="Full business address" />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { customersApi } from '../utils/api.js'
import { Modal, Field, ExportButtons, ImportButton, SearchBar, DataTable, StatusBadge, Spinner, useConfirm } from '../components/Shared.jsx'

const EMPTY = { name: '', phone: '', email: '', address: '' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null) // null | 'add' | customer obj
  const confirm = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await customersApi.getAll(search); setCustomers(r.data) }
    catch { toast.error('Failed to load customers') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (c) => {
    if (!confirm(`Delete customer "${c.name}"?`)) return
    try { await customersApi.delete(c.id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div className="space-y-6">
      <div className="section-header flex-wrap gap-3">
        <h1 className="page-title">Customers</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name or phone..." />
          <ImportButton
            onImport={f => customersApi.import(f).then(r => { load(); return r })}
            onTemplate={customersApi.importTemplate}
            templateFileName="customers-import-template.xlsx"
          />
          <ExportButtons onExcelExport={customersApi.exportExcel} onPdfExport={customersApi.exportPdf} />
          <button className="btn-primary" onClick={() => setModal(EMPTY)}>+ Add Customer</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <DataTable headers={['Name','Phone','Email','Address','Actions']} empty={customers.length===0}>
          {customers.map(c => (
            <tr key={c.id} className="table-tr">
              <td className="table-td font-medium">{c.name}</td>
              <td className="table-td">{c.phone || '—'}</td>
              <td className="table-td">{c.email || '—'}</td>
              <td className="table-td max-w-xs truncate">{c.address || '—'}</td>
              <td className="table-td">
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setModal(c)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(c)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {modal !== null && (
        <CustomerModal customer={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}

function CustomerModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({ ...customer })
  const [saving, setSaving] = useState(false)
  const isEdit = !!customer.id
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    setSaving(true)
    try {
      isEdit ? await customersApi.update(customer.id, form) : await customersApi.create(form)
      toast.success(isEdit ? 'Customer updated!' : 'Customer added!')
      onSaved()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? `Edit — ${customer.name}` : 'Add Customer'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Full Name" required><input className="input" value={form.name} onChange={e => set('name', e.target.value)} required /></Field></div>
          <Field label="Phone"><input className="input" value={form.phone||''} onChange={e => set('phone', e.target.value)} /></Field>
          <Field label="Email"><input className="input" type="email" value={form.email||''} onChange={e => set('email', e.target.value)} /></Field>
          <div className="col-span-2"><Field label="Address"><textarea className="input resize-none" rows={3} value={form.address||''} onChange={e => set('address', e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

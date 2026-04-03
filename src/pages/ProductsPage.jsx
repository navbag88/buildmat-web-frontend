import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { productsApi, INR } from '../utils/api.js'
import { Modal, Field, ExportButtons, ImportButton, SearchBar, DataTable, Spinner, useConfirm } from '../components/Shared.jsx'

const EMPTY = { name: '', category: '', unit: '', price: '', stockQty: 0, sgstPercent: 9, cgstPercent: 9 }

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)
  const confirm = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await productsApi.getAll(search); setProducts(r.data) }
    catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (p) => {
    if (!confirm(`Delete product "${p.name}"?`)) return
    try { await productsApi.delete(p.id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const stockBadge = (qty) => {
    const cls = qty > 50 ? 'bg-green-100 text-green-700' : qty > 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
    return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{qty}</span>
  }

  return (
    <div className="space-y-6">
      <div className="section-header flex-wrap gap-3">
        <h1 className="page-title">Products & Inventory</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name or category..." />
          <ImportButton onImport={f => productsApi.import(f).then(r => { load(); return r })} />
          <ExportButtons onExcelExport={productsApi.exportExcel} onPdfExport={productsApi.exportPdf} />
          <button className="btn-primary" onClick={() => setModal(EMPTY)}>+ Add Product</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <DataTable headers={['Name','Category','Unit','Price','SGST%','CGST%','Stock','Actions']} empty={products.length===0}>
          {products.map(p => (
            <tr key={p.id} className="table-tr">
              <td className="table-td font-medium">{p.name}</td>
              <td className="table-td text-gray-500">{p.category || '—'}</td>
              <td className="table-td">{p.unit}</td>
              <td className="table-td font-medium">{INR(p.price)}</td>
              <td className="table-td text-center">{p.sgstPercent}%</td>
              <td className="table-td text-center">{p.cgstPercent}%</td>
              <td className="table-td">{stockBadge(p.stockQty)}</td>
              <td className="table-td">
                <div className="flex gap-2">
                  <button className="btn-secondary btn-sm" onClick={() => setModal(p)}>Edit</button>
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(p)}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {modal !== null && (
        <ProductModal product={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
    </div>
  )
}

function ProductModal({ product, onClose, onSaved }) {
  const [form, setForm] = useState({ ...product })
  const [saving, setSaving] = useState(false)
  const isEdit = !!product.id
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name?.trim()) return toast.error('Name is required')
    if (!form.price || Number(form.price) <= 0) return toast.error('Price must be > 0')
    setSaving(true)
    try {
      isEdit ? await productsApi.update(product.id, form) : await productsApi.create(form)
      toast.success(isEdit ? 'Product updated!' : 'Product added!')
      onSaved()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={isEdit ? `Edit — ${product.name}` : 'Add Product'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Product Name" required><input className="input" value={form.name||''} onChange={e => set('name', e.target.value)} required /></Field></div>
          <Field label="Category"><input className="input" value={form.category||''} onChange={e => set('category', e.target.value)} /></Field>
          <Field label="Unit" required><input className="input" value={form.unit||''} onChange={e => set('unit', e.target.value)} placeholder="Bag, Kg, Piece..." required /></Field>
          <Field label="Price per Unit" required><input className="input" type="number" step="0.01" value={form.price||''} onChange={e => set('price', e.target.value)} required /></Field>
          <Field label="Stock Quantity"><input className="input" type="number" step="0.01" value={form.stockQty||0} onChange={e => set('stockQty', e.target.value)} /></Field>
        </div>
        <div className="border-t pt-4">
          <p className="text-sm font-semibold text-blue-700 mb-3">GST Configuration</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="SGST %"><input className="input" type="number" step="0.5" min="0" value={form.sgstPercent||0} onChange={e => set('sgstPercent', e.target.value)} /></Field>
            <Field label="CGST %"><input className="input" type="number" step="0.5" min="0" value={form.cgstPercent||0} onChange={e => set('cgstPercent', e.target.value)} /></Field>
            <div className="flex items-end pb-0.5">
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-700 w-full text-center">
                Total: {(Number(form.sgstPercent||0)+Number(form.cgstPercent||0))}%
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

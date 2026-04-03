import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { invoicesApi, customersApi, productsApi, paymentsApi, INR, downloadBlob } from '../utils/api.js'
import { Modal, Field, ExportButtons, SearchBar, DataTable, StatusBadge, Spinner, useConfirm } from '../components/Shared.jsx'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState(null)  // null | 'new' | invoice
  const [payModal, setPayModal] = useState(null)  // invoice for payment
  const confirm = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await invoicesApi.getAll(search); setInvoices(r.data) }
    catch { toast.error('Failed to load invoices') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (inv) => {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}?`)) return
    try { await invoicesApi.delete(inv.id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  const handleDownloadPdf = async (inv) => {
    try {
      const res = await invoicesApi.getPdf(inv.id)
      downloadBlob(res.data, `${inv.invoiceNumber}.pdf`)
      toast.success('PDF downloaded!')
    } catch { toast.error('PDF generation failed') }
  }

  return (
    <div className="space-y-6">
      <div className="section-header flex-wrap gap-3">
        <h1 className="page-title">Invoices</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoice, customer..." />
          <ExportButtons onExcelExport={invoicesApi.exportExcel} onPdfExport={invoicesApi.exportPdf} />
          <button className="btn-primary" onClick={() => setModal('new')}>+ New Invoice</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <DataTable headers={['Invoice #','Customer','Date','Subtotal','GST','Total','Paid','Balance','Status','Actions']} empty={invoices.length===0}>
          {invoices.map(inv => (
            <tr key={inv.id} className="table-tr">
              <td className="table-td font-semibold text-blue-600">{inv.invoiceNumber}</td>
              <td className="table-td">{inv.customerName || '—'}</td>
              <td className="table-td text-gray-500">{inv.invoiceDate}</td>
              <td className="table-td text-right">{INR(inv.subtotal)}</td>
              <td className="table-td text-right text-gray-500">{inv.includeGst ? INR(inv.taxAmount) : '—'}</td>
              <td className="table-td text-right font-semibold">{INR(inv.totalAmount)}</td>
              <td className="table-td text-right text-green-700">{INR(inv.paidAmount)}</td>
              <td className="table-td text-right text-red-700">{INR(inv.balanceDue)}</td>
              <td className="table-td"><StatusBadge status={inv.status} /></td>
              <td className="table-td">
                <div className="flex gap-1.5">
                  <button className="btn-secondary btn-sm" onClick={() => setModal(inv)}>✏</button>
                  <button className="btn-secondary btn-sm text-purple-600" onClick={() => handleDownloadPdf(inv)} title="Download PDF">📄</button>
                  {inv.status !== 'PAID' && <button className="btn-success btn-sm" onClick={() => setPayModal(inv)}>Pay</button>}
                  <button className="btn-danger btn-sm" onClick={() => handleDelete(inv)}>✕</button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {modal !== null && (
        <InvoiceModal invoice={modal === 'new' ? null : modal} onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }} />
      )}
      {payModal && (
        <PaymentModal invoice={payModal} onClose={() => setPayModal(null)}
          onSaved={() => { setPayModal(null); load() }} />
      )}
    </div>
  )
}

// ── Invoice Form Modal ─────────────────────────────────────────────────────────
function InvoiceModal({ invoice, onClose, onSaved }) {
  const [customers, setCustomers] = useState([])
  const [products, setProducts]   = useState([])
  const [form, setForm]           = useState({
    customerId: '', invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now()+30*864e5).toISOString().split('T')[0],
    includeGst: true, notes: '', items: []
  })
  const [saving, setSaving] = useState(false)
  const [addItem, setAddItem] = useState({ productId: '', productName: '', unit: '', quantity: 1, unitPrice: '', sgstPercent: 9, cgstPercent: 9 })

  useEffect(() => {
    Promise.all([customersApi.getAll(), productsApi.getAll()]).then(([c, p]) => {
      setCustomers(c.data); setProducts(p.data)
    })
    if (invoice?.id) {
      invoicesApi.getById(invoice.id).then(r => {
        const d = r.data
        setForm({ customerId: d.customerId||'', invoiceDate: d.invoiceDate, dueDate: d.dueDate||'',
          includeGst: d.includeGst, notes: d.notes||'', items: d.items||[] })
      })
    }
  }, [invoice])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))
  const setAdd = (k, v) => setAddItem(a => ({...a, [k]: v}))

  const onProductSelect = (e) => {
    const p = products.find(x => x.id == e.target.value)
    if (p) setAddItem(a => ({...a, productId: p.id, productName: p.name, unit: p.unit, unitPrice: p.price, sgstPercent: p.sgstPercent, cgstPercent: p.cgstPercent}))
    else setAddItem(a => ({...a, productId: '', productName: '', unit: '', unitPrice: ''}))
  }

  const handleAddItem = () => {
    if (!addItem.productName?.trim() || !addItem.unitPrice || !addItem.quantity) return toast.error('Fill product, qty and price')
    const item = { ...addItem, quantity: Number(addItem.quantity), unitPrice: Number(addItem.unitPrice), total: Number(addItem.quantity)*Number(addItem.unitPrice) }
    set('items', [...form.items, item])
    setAddItem({ productId: '', productName: '', unit: '', quantity: 1, unitPrice: '', sgstPercent: 9, cgstPercent: 9 })
  }

  const removeItem = (i) => set('items', form.items.filter((_, idx) => idx !== i))

  const subtotal = form.items.reduce((s, it) => s + (it.quantity*it.unitPrice), 0)
  const sgst = form.includeGst ? form.items.reduce((s, it) => s + (it.quantity*it.unitPrice)*it.sgstPercent/100, 0) : 0
  const cgst = form.includeGst ? form.items.reduce((s, it) => s + (it.quantity*it.unitPrice)*it.cgstPercent/100, 0) : 0
  const grand = subtotal + sgst + cgst

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerId) return toast.error('Please select a customer')
    if (form.items.length === 0) return toast.error('Add at least one item')
    setSaving(true)
    try {
      const payload = { ...form, items: form.items.map(it => ({ ...it, total: it.quantity*it.unitPrice })) }
      invoice?.id ? await invoicesApi.update(invoice.id, payload) : await invoicesApi.create(payload)
      toast.success(invoice?.id ? 'Invoice updated!' : 'Invoice created!')
      onSaved()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={invoice?.id ? `Edit — ${invoice.invoiceNumber}` : 'New Invoice'} onClose={onClose} size="modal-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top fields */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Customer" required>
            <select className="input" value={form.customerId} onChange={e => set('customerId', e.target.value)} required>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <div className="flex items-center gap-4">
            <Field label="Invoice Date"><input className="input" type="date" value={form.invoiceDate} onChange={e => set('invoiceDate', e.target.value)} /></Field>
            <Field label="Due Date"><input className="input" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} /></Field>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-blue-700 cursor-pointer select-none">
          <input type="checkbox" checked={form.includeGst} onChange={e => set('includeGst', e.target.checked)} className="w-4 h-4 rounded" />
          Include GST in this invoice
        </label>

        {/* Add item */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Add Line Items</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <div className="col-span-2">
              <select className="input text-sm" value={addItem.productId} onChange={onProductSelect}>
                <option value="">Select product...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
              </select>
            </div>
            <input className="input text-sm" placeholder="Qty" type="number" step="0.01" value={addItem.quantity} onChange={e => setAdd('quantity', e.target.value)} />
            <input className="input text-sm" placeholder="Unit Price" type="number" step="0.01" value={addItem.unitPrice} onChange={e => setAdd('unitPrice', e.target.value)} />
            <div className="flex gap-1 items-center text-xs text-gray-500">
              SGST: {addItem.sgstPercent}% CGST: {addItem.cgstPercent}%
            </div>
            <button type="button" className="btn-success text-sm" onClick={handleAddItem}>+ Add</button>
          </div>
        </div>

        {/* Items table */}
        {form.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50">
                <tr>
                  {['Product','Unit','Qty','Price','SGST%','CGST%','Total',''].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.items.map((it, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-3 py-2">{it.productName}</td>
                    <td className="px-3 py-2 text-gray-500">{it.unit}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-right">{INR(it.unitPrice)}</td>
                    <td className="px-3 py-2 text-center">{it.sgstPercent}%</td>
                    <td className="px-3 py-2 text-center">{it.cgstPercent}%</td>
                    <td className="px-3 py-2 text-right font-medium">{INR(it.quantity*it.unitPrice)}</td>
                    <td className="px-3 py-2"><button type="button" className="text-red-500 hover:text-red-700" onClick={() => removeItem(i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{INR(subtotal)}</span></div>
            {form.includeGst && <>
              <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{INR(sgst)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{INR(cgst)}</span></div>
            </>}
            <div className="flex justify-between border-t pt-1 font-bold text-base"><span>Grand Total</span><span className="text-blue-700">{INR(grand)}</span></div>
          </div>
        </div>

        <Field label="Notes"><textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Invoice'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Payment Modal ──────────────────────────────────────────────────────────────
function PaymentModal({ invoice, onClose, onSaved }) {
  const [form, setForm] = useState({ invoiceId: invoice.id, amount: invoice.balanceDue, paymentDate: new Date().toISOString().split('T')[0], method: 'CASH', reference: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter valid amount')
    if (Number(form.amount) > invoice.balanceDue + 0.01) return toast.error(`Amount exceeds balance due of ${INR(invoice.balanceDue)}`)
    setSaving(true)
    try { await paymentsApi.create({...form, amount: Number(form.amount)}); toast.success('Payment recorded!'); onSaved() }
    catch { toast.error('Failed to record payment') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Record Payment — ${invoice.invoiceNumber}`} onClose={onClose}>
      <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
        <span className="font-medium">Balance Due: </span>
        <span className="text-blue-700 font-bold">{INR(invoice.balanceDue)}</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" required><input className="input" type="number" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} required /></Field>
          <Field label="Date"><input className="input" type="date" value={form.paymentDate} onChange={e => setForm(f=>({...f,paymentDate:e.target.value}))} /></Field>
          <Field label="Method">
            <select className="input" value={form.method} onChange={e => setForm(f=>({...f,method:e.target.value}))}>
              {['CASH','CHEQUE','NEFT/RTGS','UPI','CARD'].map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference"><input className="input" value={form.reference} onChange={e => setForm(f=>({...f,reference:e.target.value}))} placeholder="Cheque no / UTR..." /></Field>
        </div>
        <Field label="Notes"><input className="input" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} /></Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-success" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
        </div>
      </form>
    </Modal>
  )
}

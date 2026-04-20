import React, { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { purchasesApi, suppliersApi, productsApi, INR, downloadBlob } from '../utils/api.js'
import { Modal, Field, ExportButtons, SearchBar, DataTable, StatusBadge, Spinner, useConfirm } from '../components/Shared.jsx'
import { isSuperAdmin } from '../utils/auth.js'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState(null)     // null | 'new' | purchase obj
  const [payModal, setPayModal]   = useState(null)     // purchase for payment
  const [viewPO, setViewPO]       = useState(null)     // purchase to view detail
  const confirm = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await purchasesApi.getAll(search); setPurchases(r.data) }
    catch { toast.error('Failed to load purchases') }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (po) => {
    if (!confirm(`Delete purchase order ${po.purchaseNumber}? This will also delete its payments.`)) return
    try { await purchasesApi.delete(po.id); toast.success('Deleted'); load() }
    catch { toast.error('Delete failed') }
  }

  return (
    <div className="space-y-6">
      <div className="section-header flex-wrap gap-3">
        <h1 className="page-title">Purchases</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search PO#, supplier..." />
          <ExportButtons onExcelExport={purchasesApi.exportExcel} onPdfExport={purchasesApi.exportPdf} />
          <button className="btn-primary" onClick={() => setModal('new')}>+ New Purchase</button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <DataTable
          headers={['PO #', 'Supplier', 'Date', 'Subtotal', 'GST', 'Total', 'Paid', 'Balance', 'Status', 'Actions']}
          empty={purchases.length === 0}
        >
          {purchases.map(po => (
            <tr key={po.id} className="table-tr">
              <td className="table-td font-semibold text-blue-600">{po.purchaseNumber}</td>
              <td className="table-td">{po.supplierName || '—'}</td>
              <td className="table-td text-gray-500">{po.purchaseDate}</td>
              <td className="table-td text-right">{INR(po.subtotal)}</td>
              <td className="table-td text-right text-gray-500">{po.includeGst ? INR(po.taxAmount) : '—'}</td>
              <td className="table-td text-right font-semibold">{INR(po.totalAmount)}</td>
              <td className="table-td text-right text-green-700">{INR(po.paidAmount)}</td>
              <td className="table-td text-right text-red-700">{INR(po.balanceDue)}</td>
              <td className="table-td"><StatusBadge status={po.status} /></td>
              <td className="table-td">
                <div className="flex gap-1.5">
                  <button className="btn-secondary btn-sm text-blue-600" onClick={() => setViewPO(po)} title="View Details">👁</button>
                  <button className="btn-secondary btn-sm" onClick={() => setModal(po)}>✏</button>
                  {po.status !== 'PAID' && (
                    <button className="btn-success btn-sm" onClick={() => setPayModal(po)}>Pay</button>
                  )}
                  {isSuperAdmin() && (
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(po)}>✕</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {modal !== null && (
        <PurchaseModal
          purchase={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
      {payModal && (
        <PurchasePaymentModal
          purchase={payModal}
          onClose={() => setPayModal(null)}
          onSaved={() => { setPayModal(null); load() }}
        />
      )}
      {viewPO && (
        <PurchaseViewModal
          purchase={viewPO}
          onClose={() => setViewPO(null)}
          onPaymentDeleted={load}
        />
      )}
    </div>
  )
}

// ── Purchase Form Modal ────────────────────────────────────────────────────────
function PurchaseModal({ purchase, onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts]   = useState([])
  const [form, setForm] = useState({
    supplierId: '', purchaseDate: new Date().toISOString().split('T')[0],
    dueDate: '', supplierInvoiceRef: '', includeGst: true, notes: '', items: []
  })
  const [saving, setSaving] = useState(false)
  const [addItem, setAddItem] = useState({
    productId: '', productName: '', unit: '', quantity: 1, unitPrice: '', sgstPercent: 9, cgstPercent: 9
  })

  useEffect(() => {
    Promise.all([suppliersApi.getAll(), productsApi.getAll()]).then(([s, p]) => {
      setSuppliers(s.data); setProducts(p.data)
    })
    if (purchase?.id) {
      purchasesApi.getById(purchase.id).then(r => {
        const d = r.data
        setForm({
          supplierId: d.supplierId || '',
          purchaseDate: d.purchaseDate,
          dueDate: d.dueDate || '',
          supplierInvoiceRef: d.supplierInvoiceRef || '',
          includeGst: d.includeGst,
          notes: d.notes || '',
          items: d.items || [],
        })
      })
    }
  }, [purchase])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setAdd = (k, v) => setAddItem(a => ({ ...a, [k]: v }))

  const onProductSelect = (e) => {
    const p = products.find(x => x.id == e.target.value)
    if (p) setAddItem(a => ({ ...a, productId: p.id, productName: p.name, unit: p.unit, unitPrice: p.price, sgstPercent: p.sgstPercent, cgstPercent: p.cgstPercent }))
    else setAddItem(a => ({ ...a, productId: '', productName: '', unit: '', unitPrice: '' }))
  }

  const handleAddItem = () => {
    if (!addItem.productName?.trim() || !addItem.unitPrice || !addItem.quantity)
      return toast.error('Fill product, qty and price')
    const item = {
      ...addItem,
      quantity: Number(addItem.quantity),
      unitPrice: Number(addItem.unitPrice),
      total: Number(addItem.quantity) * Number(addItem.unitPrice),
    }
    set('items', [...form.items, item])
    setAddItem({ productId: '', productName: '', unit: '', quantity: 1, unitPrice: '', sgstPercent: 9, cgstPercent: 9 })
  }

  const removeItem = (i) => set('items', form.items.filter((_, idx) => idx !== i))

  const subtotal = form.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
  const sgst = form.includeGst ? form.items.reduce((s, it) => s + it.quantity * it.unitPrice * it.sgstPercent / 100, 0) : 0
  const cgst = form.includeGst ? form.items.reduce((s, it) => s + it.quantity * it.unitPrice * it.cgstPercent / 100, 0) : 0
  const grand = subtotal + sgst + cgst

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.supplierId) return toast.error('Please select a supplier')
    if (form.items.length === 0) return toast.error('Add at least one item')
    setSaving(true)
    try {
      const payload = { ...form, items: form.items.map(it => ({ ...it, total: it.quantity * it.unitPrice })) }
      purchase?.id
        ? await purchasesApi.update(purchase.id, payload)
        : await purchasesApi.create(payload)
      toast.success(purchase?.id ? 'Purchase order updated!' : 'Purchase order created!')
      onSaved()
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={purchase?.id ? `Edit — ${purchase.purchaseNumber}` : 'New Purchase Order'} onClose={onClose} size="modal-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Top fields */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Supplier" required>
            <select className="input" value={form.supplierId} onChange={e => set('supplierId', e.target.value)} required>
              <option value="">Select supplier...</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Supplier Invoice / Bill Ref">
            <input className="input" value={form.supplierInvoiceRef} onChange={e => set('supplierInvoiceRef', e.target.value)} placeholder="Supplier's invoice number" />
          </Field>
          <Field label="Purchase Date">
            <input className="input" type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
          </Field>
          <Field label="Due Date">
            <input className="input" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-blue-700 cursor-pointer select-none">
          <input type="checkbox" checked={form.includeGst} onChange={e => set('includeGst', e.target.checked)} className="w-4 h-4 rounded" />
          Include GST in this purchase
        </label>

        {/* Add item row */}
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
                  {['Product', 'Unit', 'Qty', 'Price', 'SGST%', 'CGST%', 'Total', ''].map(h => (
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
                    <td className="px-3 py-2 text-right font-medium">{INR(it.quantity * it.unitPrice)}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="text-red-500 hover:text-red-700" onClick={() => removeItem(i)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals summary */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{INR(subtotal)}</span></div>
            {form.includeGst && <>
              <div className="flex justify-between"><span className="text-gray-500">SGST</span><span>{INR(sgst)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">CGST</span><span>{INR(cgst)}</span></div>
            </>}
            <div className="flex justify-between border-t pt-1 font-bold text-base">
              <span>Grand Total</span>
              <span className="text-blue-700">{INR(grand)}</span>
            </div>
          </div>
        </div>

        <Field label="Notes">
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
        </Field>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Purchase'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ── Purchase View / Detail Modal ───────────────────────────────────────────────
function PurchaseViewModal({ purchase, onClose, onPaymentDeleted }) {
  const [detail, setDetail]     = useState(null)
  const [payments, setPayments] = useState([])
  const confirm = useConfirm()

  const loadDetail = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([
        purchasesApi.getById(purchase.id),
        purchasesApi.getPayments(purchase.id),
      ])
      setDetail(d.data); setPayments(p.data)
    } catch { toast.error('Failed to load purchase details') }
  }, [purchase.id])

  useEffect(() => { loadDetail() }, [loadDetail])

  const handleDeletePayment = async (pmt) => {
    if (!confirm(`Delete payment of ${INR(pmt.amount)} made on ${pmt.paymentDate}?`)) return
    try {
      await purchasesApi.deletePayment(pmt.id)
      toast.success('Payment deleted')
      loadDetail()
      onPaymentDeleted()
    } catch { toast.error('Delete failed') }
  }

  if (!detail) return (
    <div className="modal-overlay">
      <div className="modal flex items-center justify-center p-12"><Spinner /></div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth: 760 }}>
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Purchase — {detail.purchaseNumber}</h2>
            {detail.supplierInvoiceRef && (
              <p className="text-xs text-gray-500 mt-0.5">Supplier Ref: {detail.supplierInvoiceRef}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5" style={{ maxHeight: '80vh' }}>
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-blue-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-bold text-blue-700 uppercase">Supplier</p>
              <p className="font-semibold text-gray-900">{detail.supplierName || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-bold text-gray-500 uppercase">Dates</p>
              <p>Purchase Date: <span className="font-medium">{detail.purchaseDate}</span></p>
              {detail.dueDate && <p>Due Date: <span className="font-medium">{detail.dueDate}</span></p>}
            </div>
          </div>

          {/* Items */}
          {(detail.items || []).length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Line Items</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-blue-600 text-white">
                    <tr>
                      {['#', 'Product', 'Unit', 'Qty', 'Unit Price', ...(detail.includeGst ? ['SGST%', 'CGST%', 'GST Amt'] : []), 'Total'].map(h => (
                        <th key={h} className="px-3 py-2 text-xs text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((it, i) => {
                      const gstAmt = it.total * (it.sgstPercent + it.cgstPercent) / 100
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-blue-50' : 'bg-white'}>
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{it.productName}</td>
                          <td className="px-3 py-2 text-gray-500">{it.unit}</td>
                          <td className="px-3 py-2 text-right">{it.quantity}</td>
                          <td className="px-3 py-2 text-right">{INR(it.unitPrice)}</td>
                          {detail.includeGst && <>
                            <td className="px-3 py-2 text-center">{it.sgstPercent}%</td>
                            <td className="px-3 py-2 text-center">{it.cgstPercent}%</td>
                            <td className="px-3 py-2 text-right">{INR(gstAmt)}</td>
                          </>}
                          <td className="px-3 py-2 text-right font-semibold">{INR(it.total)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 border border-gray-200 rounded overflow-hidden text-sm">
              <TotRow label="Subtotal"    value={INR(detail.subtotal)} />
              {detail.includeGst && <>
                <TotRow label="SGST"       value={INR(detail.sgstAmount)} />
                <TotRow label="CGST"       value={INR(detail.cgstAmount)} />
                <TotRow label="Total GST"  value={INR(detail.taxAmount)} />
              </>}
              <TotRow label="Grand Total" value={INR(detail.totalAmount)} grand />
              <TotRow label="Paid"        value={INR(detail.paidAmount)} />
              <TotRow label="Balance Due" value={INR(detail.balanceDue)} />
            </div>
          </div>

          {/* Notes */}
          {detail.notes && (
            <div className="bg-gray-50 rounded p-3 text-sm text-gray-600">
              <span className="font-medium">Notes: </span>{detail.notes}
            </div>
          )}

          {/* Payment history */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Payment History</p>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-400 py-2">No payments recorded yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Date', 'Amount', 'Method', 'Reference', 'Notes', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map(pmt => (
                    <tr key={pmt.id} className="border-b border-gray-100">
                      <td className="px-3 py-2">{pmt.paymentDate}</td>
                      <td className="px-3 py-2 font-semibold text-green-700">{INR(pmt.amount)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{pmt.method}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{pmt.reference || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{pmt.notes || '—'}</td>
                      <td className="px-3 py-2">
                        <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeletePayment(pmt)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function TotRow({ label, value, grand }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: grand ? '10px 12px' : '6px 12px',
      background: grand ? '#2563eb' : 'white',
      color: grand ? 'white' : '#1a2332',
      fontWeight: grand ? 'bold' : 'normal',
      fontSize: grand ? 14 : 12,
    }}>
      <span>{label}</span><span>{value}</span>
    </div>
  )
}

// ── Purchase Payment Modal ─────────────────────────────────────────────────────
function PurchasePaymentModal({ purchase, onClose, onSaved }) {
  const [form, setForm] = useState({
    amount: purchase.balanceDue,
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'CASH',
    reference: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount')
    if (Number(form.amount) > purchase.balanceDue + 0.01)
      return toast.error(`Amount exceeds balance due of ${INR(purchase.balanceDue)}`)
    setSaving(true)
    try {
      await purchasesApi.addPayment(purchase.id, { ...form, amount: Number(form.amount) })
      toast.success('Payment recorded!')
      onSaved()
    } catch { toast.error('Failed to record payment') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={`Record Payment — ${purchase.purchaseNumber}`} onClose={onClose}>
      <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
        <span className="font-medium">Balance Due: </span>
        <span className="text-blue-700 font-bold">{INR(purchase.balanceDue)}</span>
        <span className="ml-4 text-gray-500">Supplier: {purchase.supplierName}</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount" required>
            <input className="input" type="number" step="0.01" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
          </Field>
          <Field label="Date">
            <input className="input" type="date" value={form.paymentDate}
              onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
          </Field>
          <Field label="Method">
            <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
              {['CASH', 'CHEQUE', 'NEFT/RTGS', 'UPI', 'CARD'].map(m => <option key={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Reference">
            <input className="input" value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="Cheque no / UTR / Ref..." />
          </Field>
        </div>
        <Field label="Notes">
          <input className="input" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-success" disabled={saving}>
            {saving ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

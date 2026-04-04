import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { settingsApi } from '../utils/api.js'
import { Field, Spinner } from '../components/Shared.jsx'

export default function SettingsPage() {
  const [form, setForm]     = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.get()
      .then(r => setForm(r.data))
      .catch(() => toast.error('Failed to load settings'))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.businessName?.trim()) return toast.error('Business name is required')
    setSaving(true)
    try {
      await settingsApi.update(form)
      toast.success('Settings saved!')
    } catch { toast.error('Failed to save settings') }
    finally { setSaving(false) }
  }

  if (!form) return <Spinner />

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="section-header">
        <h1 className="page-title">Business Settings</h1>
      </div>

      <div className="card p-6">
        <p className="text-sm text-gray-500 mb-6">
          Configure your business details. These appear on generated invoices and PDFs.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Business Name" required>
            <input
              className="input"
              value={form.businessName || ''}
              onChange={e => set('businessName', e.target.value)}
              placeholder="e.g. Acme Traders, Singh Enterprises..."
              required
            />
          </Field>

          <Field label="Tag Line / Description">
            <input
              className="input"
              value={form.tagLine || ''}
              onChange={e => set('tagLine', e.target.value)}
              placeholder="e.g. Building Material Supplier, Hardware & Plumbing..."
            />
          </Field>

          <Field label="GST Number">
            <input
              className="input"
              value={form.gstNumber || ''}
              onChange={e => set('gstNumber', e.target.value)}
              placeholder="e.g. 27ABCDE1234F1Z5"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                className="input"
                value={form.phone || ''}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </Field>

            <Field label="Email">
              <input
                className="input"
                type="email"
                value={form.email || ''}
                onChange={e => set('email', e.target.value)}
                placeholder="billing@yourbusiness.com"
              />
            </Field>
          </div>

          <Field label="Address">
            <textarea
              className="input resize-none"
              rows={2}
              value={form.address || ''}
              onChange={e => set('address', e.target.value)}
              placeholder="Shop / office address..."
            />
          </Field>

          {/* Preview card */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Invoice Header Preview</p>
            <p className="font-bold text-blue-700 text-base">{form.businessName || 'My Business'}</p>
            {(form.tagLine || form.gstNumber) && (
              <p className="text-gray-500 text-xs mt-0.5">
                {[form.tagLine, form.gstNumber ? `GST No: ${form.gstNumber}` : ''].filter(Boolean).join(' | ')}
              </p>
            )}
            {(form.phone || form.email) && (
              <p className="text-gray-500 text-xs mt-0.5">
                {[form.phone ? `Ph: ${form.phone}` : '', form.email].filter(Boolean).join(' | ')}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

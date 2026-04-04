import React, { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { settingsApi } from '../utils/api.js'
import { Field, Spinner } from '../components/Shared.jsx'
import { Upload, X, ImageIcon } from 'lucide-react'

export default function SettingsPage() {
  const [form, setForm]       = useState(null)
  const [saving, setSaving]   = useState(false)
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const loadSettings = () =>
    settingsApi.get()
      .then(r => {
        setForm(r.data)
        if (r.data.hasLogo) {
          settingsApi.getLogo()
            .then(lr => {
              setLogoUrl(URL.createObjectURL(new Blob([lr.data], { type: lr.headers['content-type'] || 'image/png' })))
            })
            .catch(() => {})
        } else {
          setLogoUrl(null)
        }
      })
      .catch(() => toast.error('Failed to load settings'))

  useEffect(() => { loadSettings() }, [])

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

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file')
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be under 2 MB')
    setLogoFile(file)
    setLogoUrl(URL.createObjectURL(file))
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return
    setUploading(true)
    try {
      await settingsApi.uploadLogo(logoFile)
      setLogoFile(null)
      toast.success('Logo uploaded!')
      loadSettings()
    } catch { toast.error('Failed to upload logo') }
    finally { setUploading(false) }
  }

  const handleRemoveLogo = async () => {
    if (!window.confirm('Remove the business logo?')) return
    try {
      await settingsApi.removeLogo()
      setLogoUrl(null)
      setLogoFile(null)
      setForm(f => ({ ...f, hasLogo: false }))
      toast.success('Logo removed')
    } catch { toast.error('Failed to remove logo') }
  }

  const cancelFileSelect = () => {
    setLogoFile(null)
    if (form?.hasLogo) {
      settingsApi.getLogo()
        .then(lr => setLogoUrl(URL.createObjectURL(new Blob([lr.data]))))
        .catch(() => setLogoUrl(null))
    } else {
      setLogoUrl(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (!form) return <Spinner />

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="section-header">
        <h1 className="page-title">Business Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure your business details — these appear on all generated invoices.</p>
      </div>

      {/* Logo Section */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Business Logo</h2>
        <div className="flex items-start gap-5">
          {/* Logo preview */}
          <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
            {logoUrl
              ? <img src={logoUrl} alt="Business Logo" className="w-full h-full object-contain p-2" />
              : <div className="text-center">
                  <ImageIcon size={24} className="text-gray-300 mx-auto mb-1" />
                  <span className="text-xs text-gray-400">No logo</span>
                </div>
            }
          </div>

          {/* Upload controls */}
          <div className="flex-1 space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Upload your business logo (PNG, JPG, or SVG, max 2 MB). It will appear at the top-left of every invoice PDF.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex flex-wrap gap-2">
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center gap-2 text-sm">
                <Upload size={14} /> Choose Image
              </button>

              {logoFile && (
                <>
                  <button type="button" onClick={handleUploadLogo} disabled={uploading}
                    className="btn-primary flex items-center gap-2 text-sm">
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button type="button" onClick={cancelFileSelect}
                    className="btn-secondary flex items-center gap-2 text-sm text-red-500 hover:text-red-600">
                    <X size={14} /> Cancel
                  </button>
                </>
              )}

              {(form.hasLogo || logoUrl) && !logoFile && (
                <button type="button" onClick={handleRemoveLogo}
                  className="btn-secondary flex items-center gap-2 text-sm text-red-500 hover:text-red-600">
                  <X size={14} /> Remove Logo
                </button>
              )}
            </div>

            {logoFile && (
              <p className="text-xs text-amber-600">
                Selected: {logoFile.name} — click <strong>Upload</strong> to save.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Business Details Form */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Business Details</h2>

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

          {/* Invoice header preview */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Invoice Header Preview</p>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="logo" className="h-10 w-auto object-contain" />
              )}
              <div>
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
            </div>
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

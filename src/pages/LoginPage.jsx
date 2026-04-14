import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { toast } from 'react-hot-toast'
import { settingsApi } from '../utils/api.js'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]           = useState({ username: '', password: '' })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [showForgot, setShowForgot] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(form.username, form.password)
      toast.success('Welcome back!')
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-slate-900 flex-col justify-center px-16">
        <div className="text-5xl mb-6">🏗</div>
        <h1 className="text-4xl font-extrabold text-white mb-2">BuildMat</h1>
        <p className="text-blue-400 text-xl font-medium mb-8">Billing System</p>
        <div className="w-12 h-0.5 bg-blue-600 mb-6"></div>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Complete billing solution for building material suppliers.
        </p>
        <div className="space-y-3">
          {['Invoice & GST Management','Customer & Product Catalog','Payment Tracking','MIS Reports & Exports'].map(f => (
            <div key={f} className="flex items-center gap-3 text-slate-400 text-sm">
              <span className="text-green-400">✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right login */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-8">
              <p className="text-gray-500 text-sm">Welcome back</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-1">Sign in</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <input className="input" type="text" placeholder="Enter username" value={form.username}
                  onChange={e => setForm(f => ({...f, username: e.target.value}))} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Password</label>
                  <button type="button" onClick={() => setShowForgot(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    Forgot password?
                  </button>
                </div>
                <input className="input" type="password" placeholder="Enter password" value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">⚠ {error}</div>}
              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3 text-base font-semibold">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
    </div>
  )
}

function ForgotPasswordModal({ onClose }) {
  const [username, setUsername]   = useState('')
  const [step, setStep]           = useState('form')   // 'form' | 'info'
  const [contactInfo, setContact] = useState(null)
  const [loading, setLoading]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim()) return
    setLoading(true)
    try {
      // Fetch admin contact info from the public settings endpoint
      const res = await settingsApi.get()
      const s   = res.data
      setContact({
        businessName: s.businessName,
        phone:        s.phone,
        email:        s.email,
      })
      setStep('info')
    } catch {
      // Even if settings fetch fails, still show the generic message
      setContact(null)
      setStep('info')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-7">
        {step === 'form' ? (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Forgot Password</h3>
                <p className="text-sm text-gray-500 mt-1">Enter your username to get help</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <button type="submit" disabled={loading}
                className="w-full btn-primary py-2.5 text-sm font-semibold">
                {loading ? 'Please wait...' : 'Continue'}
              </button>
            </form>

            <button onClick={onClose} className="w-full text-center text-sm text-gray-400 hover:text-gray-600 mt-4">
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-xl font-bold text-gray-900">Contact Administrator</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed">
              Password resets are handled by your system administrator. Please contact them with your username
              and they will reset your password from the <span className="font-semibold">Users</span> section.
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your username</p>
              <p className="font-semibold text-gray-900">{username}</p>

              {contactInfo && (contactInfo.phone || contactInfo.email) && (
                <>
                  <div className="border-t border-gray-200 pt-2.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      {contactInfo.businessName || 'Admin'} Contact
                    </p>
                    {contactInfo.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="text-gray-400">📞</span>
                        <a href={`tel:${contactInfo.phone}`} className="text-blue-600 hover:underline">{contactInfo.phone}</a>
                      </div>
                    )}
                    {contactInfo.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                        <span className="text-gray-400">✉</span>
                        <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:underline">{contactInfo.email}</a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className="w-full btn-primary py-2.5 text-sm font-semibold">
              Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  )
}

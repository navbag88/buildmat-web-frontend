import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App.jsx'
import { toast } from 'react-hot-toast'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                <input className="input" type="password" placeholder="Enter password" value={form.password}
                  onChange={e => setForm(f => ({...f, password: e.target.value}))} required />
              </div>
              {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">⚠ {error}</div>}
              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3 text-base font-semibold">
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-gray-400 text-xs mt-6">Default: admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  )
}

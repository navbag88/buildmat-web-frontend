import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { usersApi } from '../utils/api.js'
import { getUser, isSuperAdmin } from '../utils/auth.js'
import { Field, Spinner } from '../components/Shared.jsx'
import { UserPlus, Pencil, Trash2, KeyRound, Shield, ShieldCheck, User } from 'lucide-react'

const ROLE_META = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
  ADMIN:       { label: 'Admin',       color: 'bg-blue-100 text-blue-700',     icon: Shield },
  USER:        { label: 'User',        color: 'bg-gray-100 text-gray-600',     icon: User },
}

const emptyForm = { fullName: '', username: '', password: '', role: 'USER', active: true }

export default function UsersPage() {
  const me = getUser()
  const superAdmin = isSuperAdmin()

  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)   // null | 'create' | 'edit' | 'password'
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [pwForm, setPwForm]     = useState({ password: '', confirm: '' })
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = () => {
    setLoading(true)
    usersApi.getAll()
      .then(r => setUsers(r.data))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setForm(emptyForm); setModal('create') }

  const openEdit = (u) => {
    setSelected(u)
    setForm({ fullName: u.fullName, username: u.username, role: u.role, active: u.active, password: '' })
    setModal('edit')
  }

  const openPassword = (u) => { setSelected(u); setPwForm({ password: '', confirm: '' }); setModal('password') }

  const closeModal = () => { setModal(null); setSelected(null) }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.fullName?.trim()) return toast.error('Full name is required')
    if (modal === 'create') {
      if (!form.username?.trim()) return toast.error('Username is required')
      if (!form.password?.trim()) return toast.error('Password is required')
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        await usersApi.create({ fullName: form.fullName, username: form.username, password: form.password, role: form.role, active: form.active })
        toast.success('User created!')
      } else {
        await usersApi.update(selected.id, { fullName: form.fullName, role: form.role, active: form.active })
        toast.success('User updated!')
      }
      load(); closeModal()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user')
    } finally { setSaving(false) }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (!pwForm.password) return toast.error('Password is required')
    if (pwForm.password !== pwForm.confirm) return toast.error('Passwords do not match')
    if (pwForm.password.length < 6) return toast.error('Password must be at least 6 characters')
    setSaving(true)
    try {
      await usersApi.changePassword(selected.id, pwForm.password)
      toast.success('Password changed!')
      closeModal()
    } catch { toast.error('Failed to change password') }
    finally { setSaving(false) }
  }

  const handleDelete = async (u) => {
    if (u.id === me?.id) return toast.error("You can't delete your own account")
    if (!window.confirm(`Delete user "${u.fullName}"? This cannot be undone.`)) return
    setDeleting(u.id)
    try {
      await usersApi.delete(u.id)
      toast.success('User deleted')
      load()
    } catch { toast.error('Failed to delete user') }
    finally { setDeleting(null) }
  }

  // Role options available to the current user when creating/editing
  const availableRoles = superAdmin
    ? ['SUPER_ADMIN', 'ADMIN', 'USER']
    : ['USER']

  const RoleBadge = ({ role }) => {
    const meta = ROLE_META[role] || ROLE_META.USER
    const Icon = meta.icon
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
        <Icon size={11} /> {meta.label}
      </span>
    )
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-5">
      <div className="section-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage system users and their access levels</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Username</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                      {(u.fullName || u.username).split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <span className="font-medium text-gray-900">{u.fullName || '—'}</span>
                    {u.id === me?.id && <span className="text-xs text-gray-400">(you)</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.username}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)}
                      className="p-1.5 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Edit user">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => openPassword(u)}
                      className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Change password">
                      <KeyRound size={14} />
                    </button>
                    {u.id !== me?.id && (
                      <button onClick={() => handleDelete(u)} disabled={deleting === u.id}
                        className="p-1.5 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        title="Delete user">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b">
              <h2 className="text-base font-bold text-gray-900">
                {modal === 'create' ? 'Add New User' : `Edit User — ${selected?.fullName}`}
              </h2>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <Field label="Full Name" required>
                <input className="input" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                  placeholder="e.g. Ramesh Kumar" required />
              </Field>

              {modal === 'create' && (
                <>
                  <Field label="Username" required>
                    <input className="input" value={form.username} onChange={e => set('username', e.target.value)}
                      placeholder="e.g. ramesh.kumar" required />
                  </Field>
                  <Field label="Password" required>
                    <input className="input" type="password" value={form.password}
                      onChange={e => set('password', e.target.value)}
                      placeholder="Min 6 characters" required minLength={6} />
                  </Field>
                </>
              )}

              <Field label="Role">
                <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
                    className="w-4 h-4 rounded accent-blue-600" />
                  <span className="text-sm text-gray-700">Account is active</span>
                </label>
              </Field>

              {/* Role description */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                {form.role === 'SUPER_ADMIN' && 'Super Admin can create/manage all users, change settings, and access everything.'}
                {form.role === 'ADMIN' && 'Admin can manage users (create regular users), change business settings, and access all data.'}
                {form.role === 'USER' && 'User can view and manage invoices, customers, products, and payments.'}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : modal === 'create' ? 'Create User' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {modal === 'password' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b">
              <h2 className="text-base font-bold text-gray-900">Change Password — {selected?.fullName}</h2>
            </div>
            <form onSubmit={handlePassword} className="px-6 py-5 space-y-4">
              <Field label="New Password" required>
                <input className="input" type="password" value={pwForm.password}
                  onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters" required minLength={6} />
              </Field>
              <Field label="Confirm Password" required>
                <input className="input" type="password" value={pwForm.confirm}
                  onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat password" required />
              </Field>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

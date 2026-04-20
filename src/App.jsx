import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getUser, isAdmin as checkIsAdmin } from './utils/auth'
import api from './utils/api'
import Layout from './components/Layout'
import Login from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Customers from './pages/CustomersPage'
import Products from './pages/ProductsPage'
import Invoices from './pages/InvoicesPage'
import Payments from './pages/PaymentsPage'
import Suppliers from './pages/SuppliersPage'
import Purchases from './pages/PurchasesPage'
import Reports from './pages/ReportsPage'
import Users from './pages/UsersPage'
import Settings from './pages/SettingsPage'

export function useAuth() {
  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    // Server sets the HTTP-only session cookie; we store only display metadata here.
    localStorage.setItem('user', JSON.stringify({
      id: res.data.id,
      username: res.data.username,
      fullName: res.data.fullName,
      role: res.data.role,
    }))
    return res.data
  }
  return { login, isAdmin: checkIsAdmin() }
}

// Auth is ultimately enforced by the server-side session cookie.
// getUser() just prevents a flash of protected UI before the first API call returns 401.
const PrivateRoute = ({ children }) =>
  getUser() ? children : <Navigate to="/login" replace />

const AdminRoute = ({ children }) =>
  getUser() && checkIsAdmin() ? children : <Navigate to="/dashboard" replace />

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"  element={<Dashboard />} />
        <Route path="customers"  element={<Customers />} />
        <Route path="products"   element={<Products />} />
        <Route path="invoices"   element={<Invoices />} />
        <Route path="invoices/new"       element={<Invoices />} />
        <Route path="invoices/:id/edit"  element={<Invoices />} />
        <Route path="payments"   element={<Payments />} />
        <Route path="suppliers"  element={<Suppliers />} />
        <Route path="purchases"  element={<Purchases />} />
        <Route path="reports"    element={<Reports />} />
        <Route path="users"      element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="settings"   element={<AdminRoute><Settings /></AdminRoute>} />
      </Route>
    </Routes>
  )
}

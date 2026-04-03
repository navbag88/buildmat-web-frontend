import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { getToken, isAdmin as checkIsAdmin } from './utils/auth'
import api from './utils/api'
import Layout from './components/Layout'
import Login from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Customers from './pages/CustomersPage'
import Products from './pages/ProductsPage'
import Invoices from './pages/InvoicesPage'
import Payments from './pages/PaymentsPage'
import Reports from './pages/ReportsPage'
import Users from './pages/UsersPage'

export function useAuth() {
  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    return res.data
  }
  return { login, isAdmin: checkIsAdmin() }
}

const PrivateRoute = ({ children }) =>
  getToken() ? children : <Navigate to="/login" replace />

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
        <Route path="reports"    element={<Reports />} />
        <Route path="users"      element={<Users />} />
      </Route>
    </Routes>
  )
}

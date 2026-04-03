import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { dashboardApi, INR } from '../utils/api.js'
import { toast } from 'react-hot-toast'

function StatCard({ label, value, color, bg, sub }) {
  return (
    <div className={`stat-card ${bg}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

const STATUS_COLOR = { PAID: '#16a34a', PARTIAL: '#d97706', UNPAID: '#dc2626' }

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    dashboardApi.stats().then(r => setStats(r.data)).catch(() => toast.error('Failed to load dashboard'))
  }, [])

  if (!stats) return <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>

  const chartData = [
    { name: 'Paid',    value: Number(stats.paidCount    || 0) },
    { name: 'Partial', value: Number(stats.partialCount || 0) },
    { name: 'Unpaid',  value: Number(stats.unpaidCount  || 0) },
  ]

  return (
    <div className="space-y-6">
      <div className="section-header">
        <h1 className="page-title">Dashboard</h1>
        <button className="btn-primary" onClick={() => navigate('/invoices')}>+ New Invoice</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard label="Total Revenue"    value={INR(stats.totalRevenue)}  color="text-blue-600"   bg="bg-blue-50" />
        <StatCard label="Outstanding"      value={INR(stats.outstanding)}   color="text-red-600"    bg="bg-red-50" />
        <StatCard label="Paid Invoices"    value={stats.paidCount}          color="text-green-600"  bg="bg-green-50" />
        <StatCard label="Unpaid / Partial" value={`${stats.unpaidCount} / ${stats.partialCount}`} color="text-amber-600" bg="bg-amber-50" />
        <StatCard label="Customers"        value={stats.customerCount}      color="text-purple-600" bg="bg-purple-50"
          sub={`${stats.productCount} products`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-700 mb-4">Invoice Status</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={40}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [v, 'Count']} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLOR[entry.name.toUpperCase()] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent invoices */}
        <div className="card col-span-2">
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Recent Invoices</h3>
            <button className="text-blue-600 text-sm hover:underline" onClick={() => navigate('/invoices')}>View all →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-th">Invoice #</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Date</th>
                  <th className="table-th text-right">Amount</th>
                  <th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentInvoices || []).map(inv => (
                  <tr key={inv.id} className="table-tr cursor-pointer" onClick={() => navigate('/invoices')}>
                    <td className="table-td font-medium text-blue-600">{inv.invoiceNumber}</td>
                    <td className="table-td">{inv.customerName || '—'}</td>
                    <td className="table-td text-gray-500">{inv.invoiceDate}</td>
                    <td className="table-td text-right font-medium">{INR(inv.totalAmount)}</td>
                    <td className="table-td">
                      <span className={`badge-${inv.status?.toLowerCase()}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

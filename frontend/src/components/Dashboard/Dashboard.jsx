import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Target, ShoppingBag, Wallet, Zap, BarChart2 } from 'lucide-react'
import { StatCard } from '../Layout/GlassCard'
import useFinancialStore from '../../store/financialStore'
import { transactionApi } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899']

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card-sm" style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
        <div style={{ color: payload[0].payload.fill }}>{payload[0].name}</div>
        <div style={{ fontWeight: 700, marginTop: 2 }}>₹{payload[0].value?.toLocaleString('en-IN')}</div>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { userId, monthlyIncome, summary, fetchSummary, summaryLoading, formatCurrency, formatCurrencyFull } = useFinancialStore()
  const [aiPlan, setAiPlan] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [recentTx, setRecentTx] = useState([])

  useEffect(() => {
    fetchSummary()
    loadRecentTransactions()
  }, [userId])

  const loadRecentTransactions = async () => {
    try {
      const now = new Date()
      const res = await transactionApi.list(userId, { month: now.getMonth() + 1, year: now.getFullYear(), limit: 5 })
      setRecentTx(res.data.transactions || [])
    } catch (e) {}
  }

  const handleGetAIPlan = async () => {
    setPlanLoading(true)
    try {
      const now = new Date()
      const res = await transactionApi.aiAnalysis(userId, { month: now.getMonth() + 1, year: now.getFullYear() })
      setAiPlan(res.data.ai_plan?.plan || 'No plan generated')
    } catch (e) {
      setAiPlan('Unable to generate plan. Please check your Groq API key.')
    } finally {
      setPlanLoading(false)
    }
  }

  // Pie chart data
  const pieData = summary ? Object.entries(summary.category_breakdown || {}).map(([key, val]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: val,
    fill: COLORS[Object.keys(summary.category_breakdown).indexOf(key) % COLORS.length]
  })) : []

  const netBalance = summary?.net_balance || 0
  const isProfit = netBalance >= 0
  const income = summary?.total_income || monthlyIncome || 0
  const expense = summary?.total_expense || 0
  const investmentAmt = summary?.total_investment || 0
  const savings = summary?.total_savings || 0

  const now = new Date()
  const monthName = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="dashboard">
      {/* Header */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title gradient-text">Financial Dashboard</h1>
            <p className="page-subtitle">Overview for {monthName} • Your money at a glance</p>
          </div>
          <motion.button
            className="btn btn-primary"
            onClick={handleGetAIPlan}
            disabled={planLoading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Zap size={16} />
            {planLoading ? 'Analyzing...' : 'AI Financial Plan'}
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard
          title="Monthly Income"
          value={formatCurrency(income)}
          subtitle="Configured income"
          icon={Wallet}
          color="#60a5fa"
        />
        <StatCard
          title="Total Expense"
          value={formatCurrency(expense)}
          subtitle={`${expense > 0 && income > 0 ? ((expense / income) * 100).toFixed(0) : 0}% of income`}
          icon={ShoppingBag}
          color="#f59e0b"
        />
        <StatCard
          title="Invested"
          value={formatCurrency(investmentAmt)}
          subtitle="This month"
          icon={TrendingUp}
          color="#8b5cf6"
        />
        <StatCard
          title={isProfit ? 'Net Profit' : 'Net Loss'}
          value={formatCurrency(Math.abs(netBalance))}
          subtitle={isProfit ? '✅ In the green' : '⚠️ Over budget'}
          icon={isProfit ? ArrowUpRight : ArrowDownRight}
          color={isProfit ? '#10b981' : '#ef4444'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Budget Ring / Pie Chart */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Expense Breakdown</h3>
            <BarChart2 size={18} color="#60a5fa" />
          </div>

          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {pieData.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: item.fill }} />
                    {item.name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
              <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ fontSize: '0.9rem' }}>No transactions yet this month</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => navigate('/daily-needs')}>
                Add Expenses
              </button>
            </div>
          )}
        </motion.div>

        {/* Budget Health */}
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Budget Health</h3>

          {[
            { label: 'Food & Groceries', amount: (summary?.category_breakdown?.food || 0), color: '#34d399', icon: '🍽️' },
            { label: 'Rent / EMI', amount: (summary?.category_breakdown?.rent || 0), color: '#60a5fa', icon: '🏠' },
            { label: 'Transport', amount: (summary?.category_breakdown?.transport || 0), color: '#f59e0b', icon: '🚗' },
            { label: 'Entertainment', amount: (summary?.category_breakdown?.entertainment || 0), color: '#a78bfa', icon: '🎬' },
            { label: 'Investment', amount: investmentAmt, color: '#ec4899', icon: '📈' },
          ].map((item) => {
            const pct = income > 0 ? Math.min(100, (item.amount / income) * 100) : 0
            return (
              <div key={item.label} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 6 }}>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{item.icon} {item.label}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    style={{ background: `linear-gradient(90deg, ${item.color}88, ${item.color})` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                  />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                  {pct.toFixed(0)}% of income
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>

      {/* AI Plan */}
      {aiPlan && (
        <motion.div
          className="glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(37,99,235,0.4), rgba(139,92,246,0.4))',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Zap size={16} color="#60a5fa" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Financial Analysis</h3>
            <span className="badge badge-blue">Groq AI</span>
          </div>
          <div className="ai-message" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
            {aiPlan}
          </div>
        </motion.div>
      )}

      {/* Recent Transactions */}
      <motion.div
        className="glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Recent Transactions</h3>
          <button className="btn btn-glass btn-sm" onClick={() => navigate('/daily-needs')}>View All</button>
        </div>

        {recentTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>
            No transactions yet • <button className="btn btn-primary btn-sm" onClick={() => navigate('/daily-needs')}>Add one →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentTx.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: tx.transaction_type === 'income' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem'
                  }}>
                    {tx.category === 'food' ? '🍽️' : tx.category === 'transport' ? '🚗' : tx.category === 'rent' ? '🏠' : tx.category === 'salary' ? '💰' : tx.category === 'investment' ? '📈' : '💳'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{tx.description || tx.category}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: tx.transaction_type === 'income' ? '#10b981' : tx.transaction_type === 'expense' ? '#ef4444' : '#60a5fa'
                }}>
                  {tx.transaction_type === 'expense' ? '-' : '+'}{formatCurrencyFull(tx.amount)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid-3" style={{ marginTop: 20 }}>
        {[
          { label: 'Add Expense', icon: '💳', color: '#ef4444', path: '/daily-needs' },
          { label: 'View Investments', icon: '📈', color: '#f59e0b', path: '/investment' },
          { label: 'Set a Goal', icon: '🎯', color: '#a78bfa', path: '/goals' },
        ].map((action) => (
          <motion.button
            key={action.label}
            className="glass-card-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
              cursor: 'pointer', color: 'white', textAlign: 'left',
              background: 'rgba(255,255,255,0.04)', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'Outfit, sans-serif'
            }}
            whileHover={{ scale: 1.02, background: 'rgba(255,255,255,0.08)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(action.path)}
          >
            <span style={{ fontSize: '1.5rem' }}>{action.icon}</span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}

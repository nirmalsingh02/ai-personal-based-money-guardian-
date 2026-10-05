import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Filter, TrendingUp, TrendingDown, ShoppingBag, RefreshCw, Zap } from 'lucide-react'
import { transactionApi } from '../../services/api'
import useFinancialStore from '../../store/financialStore'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import './DailyNeeds.css'

const CATEGORIES = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️', color: '#34d399' },
  { value: 'transport', label: 'Transport', icon: '🚗', color: '#60a5fa' },
  { value: 'rent', label: 'Rent / EMI', icon: '🏠', color: '#a78bfa' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬', color: '#f59e0b' },
  { value: 'health', label: 'Health', icon: '💊', color: '#34d399' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { value: 'savings', label: 'Savings', icon: '🏦', color: '#10b981' },
  { value: 'other', label: 'Other', icon: '📋', color: '#6b7280' },
]

const TX_TYPES = [
  { value: 'expense', label: 'Expense', icon: '💳', color: '#ef4444' },
  { value: 'income', label: 'Extra Income', icon: '💰', color: '#10b981' },
  { value: 'investment', label: 'Investment', icon: '📈', color: '#8b5cf6' },
  { value: 'savings', label: 'Savings', icon: '🏦', color: '#60a5fa' },
]

export default function DailyNeeds() {
  const { userId, summary, fetchSummary, transactions, fetchTransactions, removeTransaction, formatCurrency, formatCurrencyFull } = useFinancialStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', type: 'expense', category: 'food', description: '' })
  const [loading, setLoading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    fetchTransactions()
    fetchSummary()
  }, [userId])

  const handleAddTransaction = async () => {
    const amt = parseFloat(form.amount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')
    setLoading(true)
    try {
      const res = await transactionApi.create({
        user_id: userId,
        amount: amt,
        transaction_type: form.type,
        category: form.category,
        description: form.description || null,
      })
      toast.success(`✅ ${form.type} of ₹${amt.toLocaleString('en-IN')} added!`)
      setForm({ amount: '', type: 'expense', category: 'food', description: '' })
      setShowForm(false)
      fetchTransactions()
      fetchSummary()
    } catch (e) {}
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    try {
      await transactionApi.delete(id, userId)
      removeTransaction(id)
      fetchSummary()
      toast.success('Transaction removed')
    } catch (e) {}
  }

  const handleAiAnalysis = async () => {
    setAnalysisLoading(true)
    try {
      const now = new Date()
      const res = await transactionApi.aiAnalysis(userId, { month: now.getMonth() + 1, year: now.getFullYear() })
      setAiAnalysis(res.data.ai_plan?.plan || 'Analysis complete')
    } catch (e) {
      setAiAnalysis('Please check your API key and try again.')
    } finally { setAnalysisLoading(false) }
  }

  const filteredTx = transactions.filter(t => filterType === 'all' || t.transaction_type === filterType)
  const income = summary?.total_income || 0
  const expense = summary?.total_expense || 0
  const net = summary?.net_balance || 0
  const isProfit = net >= 0

  return (
    <div>
      {/* Header */}
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title gradient-text">Daily Needs</h1>
            <p className="page-subtitle">Track your daily expenses and monitor your budget in real-time</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-glass" onClick={handleAiAnalysis} disabled={analysisLoading}>
              <Zap size={15} /> {analysisLoading ? 'Analyzing...' : 'AI Analysis'}
            </button>
            <motion.button
              className="btn btn-primary"
              onClick={() => setShowForm(!showForm)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            >
              <Plus size={16} /> Add Transaction
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* P&L Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Income', value: formatCurrencyFull(income), color: '#10b981', icon: '💰', bg: 'rgba(16,185,129,0.1)' },
          { label: 'Total Expenses', value: formatCurrencyFull(expense), color: '#ef4444', icon: '💳', bg: 'rgba(239,68,68,0.1)' },
          { label: isProfit ? 'Net Profit' : 'Net Loss', value: formatCurrencyFull(Math.abs(net)), color: isProfit ? '#10b981' : '#ef4444', icon: isProfit ? '📈' : '📉', bg: isProfit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            className="glass-card"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: -10, right: -10, width: 60, height: 60, borderRadius: '50%', background: card.color, opacity: 0.08, filter: 'blur(15px)' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{card.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color }}>{card.value}</div>
              </div>
              <div style={{ fontSize: '2rem' }}>{card.icon}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Transaction Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
            <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>Add New Transaction</h3>

            {/* Type Selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block' }}>Transaction Type</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TX_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    style={{
                      padding: '8px 14px', borderRadius: 20, cursor: 'pointer',
                      background: form.type === t.value ? `${t.color}30` : 'rgba(255,255,255,0.05)',
                      color: form.type === t.value ? t.color : 'rgba(255,255,255,0.5)',
                      border: `1px solid ${form.type === t.value ? t.color + '50' : 'transparent'}`,
                      fontFamily: 'Outfit, sans-serif', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s'
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              {/* Amount */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Amount (₹)</label>
                <input
                  className="input-glass"
                  type="number"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  style={{ fontSize: '1.1rem' }}
                  autoFocus
                />
              </div>
              {/* Category */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Category</label>
                <select
                  className="input-glass"
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Description (optional)</label>
              <input
                className="input-glass"
                placeholder="What was this for?"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTransaction()}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-glass" onClick={() => setShowForm(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <motion.button
                className="btn btn-primary"
                onClick={handleAddTransaction}
                disabled={loading || !form.amount}
                style={{ flex: 2, justifyContent: 'center' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {loading ? <div className="spinner" style={{width:16,height:16}}/> : <><Plus size={16}/> Add Transaction</>}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Analysis */}
      <AnimatePresence>
        {aiAnalysis && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: 20 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, rgba(37,99,235,0.4), rgba(139,92,246,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Zap size={14} color="#60a5fa" />
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>AI Spending Analysis</h3>
                <span className="badge badge-blue">Groq AI</span>
              </div>
              <button onClick={() => setAiAnalysis(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>
            <div className="ai-message">
              <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction List */}
      <motion.div className="glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>All Transactions</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'expense', 'income', 'investment'].map(f => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`tab-btn ${filterType === f ? 'active' : ''}`}
                style={{ padding: '5px 14px', fontSize: '0.78rem' }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
            <ShoppingBag size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>No transactions yet • Click "Add Transaction" to start</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {filteredTx.map((tx, i) => {
                const cat = CATEGORIES.find(c => c.value === tx.category) || CATEGORIES[CATEGORIES.length - 1]
                const isExpense = tx.transaction_type === 'expense'
                const isIncome = tx.transaction_type === 'income'
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.2s',
                    }}
                    whileHover={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `${cat.color}15`,
                        border: `1px solid ${cat.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem'
                      }}>
                        {cat.icon}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.9)' }}>
                          {tx.description || cat.label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                          {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {' • '}<span style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'capitalize' }}>{tx.transaction_type}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        fontWeight: 700, fontSize: '0.95rem',
                        color: isIncome ? '#10b981' : isExpense ? '#ef4444' : '#60a5fa'
                      }}>
                        {isExpense ? '-' : '+'}{formatCurrencyFull(tx.amount)}
                      </span>
                      <motion.button
                        onClick={() => handleDelete(tx.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4 }}
                        whileHover={{ color: '#ef4444', scale: 1.1 }}
                      >
                        <Trash2 size={15} />
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  )
}

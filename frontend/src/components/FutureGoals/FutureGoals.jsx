import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Target, Calendar, Zap, Trash2, ChevronRight, CheckCircle, TrendingUp } from 'lucide-react'
import { goalsApi } from '../../services/api'
import useFinancialStore from '../../store/financialStore'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'
import './FutureGoals.css'

const GOAL_EMOJIS = ['🎯', '🏠', '🚗', '✈️', '💻', '📱', '👗', '🎓', '💍', '🏋️', '🎮', '📸']

export default function FutureGoals() {
  const { userId, goals, fetchGoals, goalsLoading, formatCurrency, formatCurrencyFull } = useFinancialStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', target_amount: '', target_date: '', emoji: '🎯' })
  const [loading, setLoading] = useState(false)
  const [adviceMap, setAdviceMap] = useState({})
  const [adviceLoading, setAdviceLoading] = useState({})
  const [updateMap, setUpdateMap] = useState({})

  useEffect(() => { fetchGoals() }, [userId])

  const handleCreate = async () => {
    if (!form.title.trim() || !form.target_amount) return toast.error('Please fill title and target amount')
    setLoading(true)
    try {
      await goalsApi.create({
        user_id: userId,
        title: `${form.emoji} ${form.title}`,
        description: form.description,
        target_amount: parseFloat(form.target_amount),
        target_date: form.target_date ? new Date(form.target_date).toISOString() : null,
      })
      toast.success('🎯 Goal created!')
      setForm({ title: '', description: '', target_amount: '', target_date: '', emoji: '🎯' })
      setShowForm(false)
      fetchGoals()
    } catch (e) {}
    finally { setLoading(false) }
  }

  const handleDelete = async (id) => {
    try {
      await goalsApi.delete(id, userId)
      fetchGoals()
      toast.success('Goal removed')
    } catch (e) {}
  }

  const handleUpdateSavings = async (id, newAmount) => {
    try {
      await goalsApi.update(id, userId, { saved_amount: parseFloat(newAmount) })
      fetchGoals()
      toast.success('Savings updated!')
      setUpdateMap(m => ({ ...m, [id]: '' }))
    } catch (e) {}
  }

  const handleGetAdvice = async (id) => {
    setAdviceLoading(m => ({ ...m, [id]: true }))
    try {
      const res = await goalsApi.aiAdvice(id, userId)
      setAdviceMap(m => ({ ...m, [id]: res.data.advice }))
    } catch (e) {
      setAdviceMap(m => ({ ...m, [id]: 'Unable to get advice. Check your API key.' }))
    } finally {
      setAdviceLoading(m => ({ ...m, [id]: false }))
    }
  }

  return (
    <div>
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title gradient-text">Future Goals</h1>
            <p className="page-subtitle">Set financial goals, track progress, and let AI guide your savings</p>
          </div>
          <motion.button
            className="btn btn-primary"
            onClick={() => setShowForm(!showForm)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          >
            <Plus size={16} /> New Goal
          </motion.button>
        </div>
      </motion.div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginBottom: 20 }}
          >
            <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>Create New Goal</h3>

            {/* Emoji Picker */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, display: 'block' }}>Choose an icon</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {GOAL_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setForm(f => ({ ...f, emoji: e }))}
                    style={{
                      width: 38, height: 38, borderRadius: 8, fontSize: '1.3rem',
                      background: form.emoji === e ? 'rgba(96,165,250,0.2)' : 'rgba(255,255,255,0.05)',
                      border: form.emoji === e ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Goal Name</label>
                <input className="input-glass" placeholder="e.g., Buy iPhone 16" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Target Amount (₹)</label>
                <input className="input-glass" type="number" placeholder="15000" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Target Date (optional)</label>
                <input className="input-glass" type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, display: 'block' }}>Notes (optional)</label>
                <input className="input-glass" placeholder="Why do you want this?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-glass" onClick={() => setShowForm(false)} style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
              <motion.button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={loading}
                style={{ flex: 2, justifyContent: 'center' }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {loading ? <div className="spinner" style={{width:16,height:16}}/> : <><Target size={15}/> Create Goal</>}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals List */}
      {goalsLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : goals.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
          <Target size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <p style={{ fontSize: '1rem', marginBottom: 8 }}>No goals yet</p>
          <p style={{ fontSize: '0.85rem' }}>Set your first financial goal and let AI guide you there</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
            <Plus size={15} /> Create First Goal
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AnimatePresence>
            {goals.map((goal, i) => {
              const pct = goal.progress_percentage || 0
              const remaining = goal.target_amount - goal.saved_amount
              const isComplete = goal.is_completed

              return (
                <motion.div
                  key={goal.id}
                  className="glass-card"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20 }} transition={{ delay: i * 0.08 }}
                  style={{ padding: 20 }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 14, fontSize: '1.6rem',
                        background: isComplete ? 'rgba(16,185,129,0.2)' : 'rgba(96,165,250,0.15)',
                        border: `1px solid ${isComplete ? 'rgba(16,185,129,0.3)' : 'rgba(96,165,250,0.25)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isComplete ? '✅' : goal.title.slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{goal.title}</div>
                        {goal.description && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{goal.description}</div>}
                        {isComplete && <span className="badge badge-green" style={{ marginTop: 4 }}>✅ Completed!</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        className="btn btn-glass btn-sm"
                        onClick={() => handleGetAdvice(goal.id)}
                        disabled={adviceLoading[goal.id]}
                      >
                        <Zap size={13} /> {adviceLoading[goal.id] ? '...' : 'AI Advice'}
                      </button>
                      <motion.button
                        onClick={() => handleDelete(goal.id)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4 }}
                        whileHover={{ color: '#ef4444', scale: 1.1 }}
                      >
                        <Trash2 size={15} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Progress */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 8 }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Saved: <strong style={{ color: '#10b981' }}>{formatCurrencyFull(goal.saved_amount)}</strong></span>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Goal: <strong style={{ color: '#60a5fa' }}>{formatCurrencyFull(goal.target_amount)}</strong></span>
                    </div>
                    <div className="progress-bar" style={{ height: 10 }}>
                      <motion.div
                        className="progress-fill"
                        style={{ background: isComplete ? 'linear-gradient(90deg, #059669, #10b981)' : undefined }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, delay: 0.2, ease: 'easeOut' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
                      <span>{pct.toFixed(0)}% complete</span>
                      <span>₹{remaining > 0 ? remaining.toLocaleString('en-IN') : 0} remaining</span>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                    {goal.days_remaining !== null && goal.days_remaining !== undefined && (
                      <div className="glass-card-sm" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} color="#60a5fa" />
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Days Remaining</div>
                          <div style={{ fontWeight: 700, color: goal.days_remaining < 30 ? '#ef4444' : '#60a5fa', fontSize: '0.9rem' }}>{goal.days_remaining}</div>
                        </div>
                      </div>
                    )}
                    {goal.daily_savings_needed !== null && goal.daily_savings_needed !== undefined && (
                      <div className="glass-card-sm" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={14} color="#10b981" />
                        <div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>Daily Savings Needed</div>
                          <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>₹{goal.daily_savings_needed?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Update Savings */}
                  {!isComplete && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        className="input-glass"
                        type="number"
                        placeholder="Update saved amount (₹)"
                        value={updateMap[goal.id] || ''}
                        onChange={e => setUpdateMap(m => ({ ...m, [goal.id]: e.target.value }))}
                        style={{ flex: 1 }}
                        onKeyDown={e => e.key === 'Enter' && updateMap[goal.id] && handleUpdateSavings(goal.id, updateMap[goal.id])}
                      />
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => updateMap[goal.id] && handleUpdateSavings(goal.id, updateMap[goal.id])}
                        disabled={!updateMap[goal.id]}
                      >
                        Update
                      </button>
                    </div>
                  )}

                  {/* AI Advice */}
                  <AnimatePresence>
                    {adviceMap[goal.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        style={{ marginTop: 14 }}
                      >
                        <div className="divider" />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
                          <Zap size={14} color="#60a5fa" />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#60a5fa' }}>AI Goal Advisor</span>
                          <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Groq AI</span>
                        </div>
                        <div className="ai-message" style={{ fontSize: '0.85rem' }}>
                          <ReactMarkdown>{adviceMap[goal.id]}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

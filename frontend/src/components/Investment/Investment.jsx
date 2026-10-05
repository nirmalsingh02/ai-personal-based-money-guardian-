import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Search, RefreshCw, Zap, Info } from 'lucide-react'
import { investmentApi } from '../../services/api'
import useFinancialStore from '../../store/financialStore'
import ReactMarkdown from 'react-markdown'
import './Investment.css'

const POPULAR = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'AAPL', 'GOOGL']

const StockTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  const isPrediction = payload[0]?.payload?.is_prediction
  return (
    <div className="glass-card-sm" style={{ padding: '10px 14px', fontSize: '0.82rem', borderColor: isPrediction ? 'rgba(251,191,36,0.3)' : undefined }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: isPrediction ? '#fbbf24' : '#60a5fa', fontSize: '1rem' }}>
        ₹{(d?.value || payload[0]?.payload?.predicted_price || 0).toFixed(2)}
      </div>
      {isPrediction && <div style={{ color: '#fbbf24', fontSize: '0.72rem', marginTop: 2 }}>🔮 AI Prediction</div>}
    </div>
  )
}

export default function Investment() {
  const { userId, summary, monthlyIncome, formatCurrency, formatCurrencyFull } = useFinancialStore()
  const [suggested, setSuggested] = useState(null)
  const [selectedStock, setSelectedStock] = useState(null)
  const [stockData, setStockData] = useState(null)
  const [stockLoading, setStockLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [aiAdvice, setAiAdvice] = useState(null)
  const [adviceLoading, setAdviceLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadSuggested()
  }, [userId])

  const loadSuggested = async () => {
    try {
      const res = await investmentApi.suggested(userId)
      setSuggested(res.data)
    } catch (e) {}
  }

  const loadStock = async (symbol) => {
    setStockLoading(true)
    setSelectedStock(symbol)
    setStockData(null)
    try {
      const res = await investmentApi.stock(symbol, '3mo')
      setStockData(res.data)
    } catch (e) {}
    finally { setStockLoading(false) }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    await loadStock(searchQuery.trim().toUpperCase())
  }

  const handleGetAdvice = async () => {
    setAdviceLoading(true)
    try {
      const available = suggested?.available_to_invest || 0
      const res = await investmentApi.aiAdvice({ user_id: userId, available_amount: available, risk_profile: 'moderate' })
      setAiAdvice(res.data.advice)
    } catch (e) {
      setAiAdvice('Unable to get advice. Please check your API key.')
    } finally { setAdviceLoading(false) }
  }

  // Combine historical + prediction for chart
  const chartData = stockData ? [
    ...stockData.chart_data.slice(-30).map(d => ({
      date: d.date.slice(5), // MM-DD
      price: d.close,
      is_prediction: false
    })),
    ...stockData.prediction.map(d => ({
      date: d.date.slice(5),
      price: d.predicted_price,
      predicted_price: d.predicted_price,
      is_prediction: true
    }))
  ] : []

  const splitIndex = stockData ? stockData.chart_data.slice(-30).length : 0
  const available = suggested?.available_to_invest || 0

  return (
    <div>
      <motion.div className="page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title gradient-text">Investment</h1>
            <p className="page-subtitle">AI-powered stock insights, investment suggestions & portfolio planning</p>
          </div>
          <button className="btn btn-primary" onClick={handleGetAdvice} disabled={adviceLoading}>
            <Zap size={15} /> {adviceLoading ? 'Thinking...' : 'AI Investment Advice'}
          </button>
        </div>
      </motion.div>

      {/* Available Budget */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Available to Invest', value: formatCurrencyFull(available), color: '#10b981', icon: '💰' },
          { label: 'Monthly Income', value: formatCurrencyFull(monthlyIncome), color: '#60a5fa', icon: '📅' },
          { label: 'Total Expenses', value: formatCurrencyFull(summary?.total_expense || 0), color: '#f59e0b', icon: '💳' },
        ].map((c, i) => (
          <motion.div key={c.label} className="glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
              <span style={{ fontSize: '2rem' }}>{c.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-nav" style={{ marginBottom: 20, display: 'inline-flex' }}>
        {['overview', 'stocks', 'allocation'].map(t => (
          <button key={t} className={`tab-btn ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'overview' ? '📊 Overview' : t === 'stocks' ? '📈 Stock Graph' : '🥧 Allocation'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* AI Advice */}
            {aiAdvice && (
              <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, rgba(37,99,235,0.4), rgba(139,92,246,0.4))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Zap size={14} color="#60a5fa" />
                  </div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>AI Investment Strategy</h3>
                  <span className="badge badge-blue">Groq AI</span>
                </div>
                <div className="ai-message"><ReactMarkdown>{aiAdvice}</ReactMarkdown></div>
              </motion.div>
            )}

            {/* Stock Cards */}
            {suggested?.suggested_stocks?.stocks?.length > 0 && (
              <>
                <h3 style={{ fontWeight: 700, marginBottom: 14, color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem' }}>
                  📌 Suggested Stocks for your ₹{available.toLocaleString('en-IN')} budget
                </h3>
                <div className="grid-3" style={{ marginBottom: 20 }}>
                  {suggested.suggested_stocks.stocks.slice(0, 6).map((stock, i) => (
                    <motion.div
                      key={stock.symbol}
                      className="glass-card"
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                      style={{ padding: 16, cursor: 'pointer' }}
                      onClick={() => { setActiveTab('stocks'); loadStock(stock.symbol) }}
                      whileHover={{ y: -4 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{stock.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{stock.symbol}</div>
                        </div>
                        <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>{stock.sector}</span>
                      </div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 4 }}>
                        ₹{stock.current_price?.toLocaleString('en-IN')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                        {stock.is_positive ? <TrendingUp size={14} color="#10b981" /> : <TrendingDown size={14} color="#ef4444" />}
                        <span style={{ color: stock.is_positive ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {stock.is_positive ? '+' : ''}{stock.price_change_pct?.toFixed(2)}%
                        </span>
                      </div>
                      {stock.affordable_shares > 0 && (
                        <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(16,185,129,0.1)', borderRadius: 8, fontSize: '0.75rem', color: '#6ee7b7' }}>
                          🛒 You can buy <strong>{stock.affordable_shares}</strong> shares (₹{stock.investment_value?.toLocaleString('en-IN')})
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Stock Graph Tab */}
        {activeTab === 'stocks' && (
          <motion.div key="stocks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Search */}
            <motion.div className="glass-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20, padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input
                  className="input-glass"
                  placeholder="Search stock symbol (e.g., RELIANCE.NS, AAPL)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn btn-primary" onClick={handleSearch}>
                  <Search size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {POPULAR.map(s => (
                  <button key={s} className={`badge ${selectedStock === s ? 'badge-blue' : ''}`}
                    style={{ cursor: 'pointer', border: selectedStock !== s ? '1px solid rgba(255,255,255,0.15)' : undefined, color: selectedStock !== s ? 'rgba(255,255,255,0.6)' : undefined, background: selectedStock !== s ? 'transparent' : undefined, padding: '4px 12px', fontWeight: 500, fontSize: '0.78rem', transition: 'all 0.2s' }}
                    onClick={() => loadStock(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Chart */}
            {stockLoading && (
              <motion.div className="glass-card" animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '60px 0' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading stock data...</p>
              </motion.div>
            )}

            {stockData && !stockLoading && (
              <motion.div className="glass-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 20 }}>
                {/* Stock Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{selectedStock}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: '#60a5fa' }}>
                        ₹{stockData.current_price?.toLocaleString('en-IN')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {stockData.is_positive ? <TrendingUp size={18} color="#10b981" /> : <TrendingDown size={18} color="#ef4444" />}
                        <span style={{ color: stockData.is_positive ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: '1rem' }}>
                          {stockData.is_positive ? '+' : ''}{stockData.price_change_pct?.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div className="glass-card-sm" style={{ padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>52W High</div>
                      <div style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>₹{stockData['52_week_high']}</div>
                    </div>
                    <div className="glass-card-sm" style={{ padding: '8px 14px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>52W Low</div>
                      <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>₹{stockData['52_week_low']}</div>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 16, height: 2, background: '#60a5fa' }} /><span style={{ color: 'rgba(255,255,255,0.6)' }}>Historical</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 16, height: 2, background: '#fbbf24', borderTop: '2px dashed #fbbf24' }} /><span style={{ color: 'rgba(255,255,255,0.6)' }}>AI Prediction (15 days)</span></div>
                </div>

                <div className="chart-wrapper" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="predGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} width={60} />
                      <Tooltip content={<StockTooltip />} />
                      <ReferenceLine x={chartData[splitIndex - 1]?.date} stroke="rgba(251,191,36,0.5)" strokeDasharray="4 4" label={{ value: 'Today', fill: 'rgba(251,191,36,0.7)', fontSize: 11 }} />

                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#priceGradient)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#60a5fa' }}
                        connectNulls
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Prediction Summary */}
                {stockData.prediction?.length > 0 && (
                  <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span>🔮</span>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24' }}>15-Day AI Price Prediction</span>
                    </div>
                    <div style={{ display: 'flex', gap: 20, fontSize: '0.82rem', flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                        Current: <strong style={{ color: 'white' }}>₹{stockData.current_price}</strong>
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                        15-Day Target: <strong style={{ color: '#fbbf24' }}>₹{stockData.prediction[stockData.prediction.length - 1]?.predicted_price}</strong>
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                        ⚠️ Predictions are estimates. Not financial advice.
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {!stockData && !stockLoading && (
              <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
                <TrendingUp size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p>Search for a stock or click a popular one above</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Allocation Tab */}
        {activeTab === 'allocation' && (
          <motion.div key="allocation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {suggested?.allocation_plan?.allocations ? (
              <div className="grid-2">
                {suggested.allocation_plan.allocations.map((a, i) => (
                  <motion.div
                    key={a.type}
                    className="glass-card"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    style={{ padding: 20 }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.type}</div>
                        <div style={{ fontSize: '0.72rem', marginTop: 3, color: a.risk.includes('High') ? '#ef4444' : a.risk.includes('Medium') ? '#f59e0b' : '#10b981' }}>
                          Risk: {a.risk}
                        </div>
                      </div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>
                        {a.percentage}%
                      </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#10b981', marginBottom: 10 }}>
                      {formatCurrencyFull(a.amount)}
                    </div>
                    <div className="progress-bar">
                      <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }} animate={{ width: `${a.percentage}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-card" style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
                <p>Add income and expenses to see allocation suggestions</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

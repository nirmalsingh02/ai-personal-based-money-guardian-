import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronRight, Check, User, DollarSign, ArrowRight, Loader } from 'lucide-react'
import { userApi, onboardingApi } from '../../services/api'
import useFinancialStore from '../../store/financialStore'
import toast from 'react-hot-toast'
import './Onboarding.css'

const FREQUENCIES = [
  { value: 'monthly', label: 'Monthly', icon: '📅', desc: 'I get paid monthly' },
  { value: 'weekly', label: 'Weekly', icon: '📆', desc: 'I get paid weekly' },
  { value: 'yearly', label: 'Yearly', icon: '🗓️', desc: 'Annual salary/income' },
]

export default function Onboarding({ onComplete }) {
  const { userId, setUserName, setIncome, setOnboardingComplete, formatCurrencyFull } = useFinancialStore()
  const [step, setStep] = useState(0) // 0=welcome, 1=name, 2=income, 3=questions
  const [name, setName] = useState('')
  const [income, setIncomeVal] = useState('')
  const [frequency, setFrequency] = useState('monthly')
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    onboardingApi.getQuestions().then(res => setQuestions(res.data.questions || []))
  }, [])

  const handleNameStep = async () => {
    if (!name.trim()) return toast.error('Please enter your name')
    setLoading(true)
    try {
      await userApi.create({ user_id: userId, name: name.trim() })
      setUserName(name.trim())
      setStep(2)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const handleIncomeStep = async () => {
    const amt = parseFloat(income)
    if (!amt || amt <= 0) return toast.error('Please enter a valid income amount')
    setLoading(true)
    try {
      await userApi.setIncome({ user_id: userId, amount: amt, frequency })
      setIncome(amt, frequency)
      setStep(3)
    } catch (e) {}
    finally { setLoading(false) }
  }

  const handleAnswer = () => {
    const q = questions[currentQ]
    const newAnswers = [...answers, { question: q.question, answer: currentAnswer || '0', category: q.category }]
    setAnswers(newAnswers)
    setCurrentAnswer('')

    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1)
    } else {
      handleFinishOnboarding(newAnswers)
    }
  }

  const handleSkip = () => {
    const q = questions[currentQ]
    const newAnswers = [...answers, { question: q.question, answer: '0', category: q.category }]
    setAnswers(newAnswers)
    setCurrentAnswer('')
    if (currentQ + 1 < questions.length) {
      setCurrentQ(currentQ + 1)
    } else {
      handleFinishOnboarding(newAnswers)
    }
  }

  const handleFinishOnboarding = async (finalAnswers) => {
    setLoading(true)
    try {
      await onboardingApi.submit({ user_id: userId, answers: finalAnswers })
      setOnboardingComplete(true)
      toast.success('🎉 Setup complete! Welcome to FinanceAI')
      onComplete()
    } catch (e) {
      toast.error('Setup failed — please try again')
    } finally { setLoading(false) }
  }

  const monthlyEquivalent = income ? (
    frequency === 'weekly' ? parseFloat(income) * 4.33 :
    frequency === 'yearly' ? parseFloat(income) / 12 :
    parseFloat(income)
  ) : 0

  return (
    <div className="onboarding-container">
      {/* Animated background particles */}
      {[...Array(8)].map((_, i) => (
        <div key={i} className="particle" style={{
          width: Math.random() * 6 + 2 + 'px',
          height: Math.random() * 6 + 2 + 'px',
          left: Math.random() * 100 + 'vw',
          animationDuration: (Math.random() * 15 + 10) + 's',
          animationDelay: (Math.random() * 10) + 's',
          background: ['#60a5fa','#a78bfa','#34d399','#f59e0b'][i % 4]
        }} />
      ))}

      <div className="onboarding-card glass-card">
        <div className="onboarding-header">
          <motion.div
            className="onboarding-logo"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
          >
            <Sparkles size={32} color="#60a5fa" />
          </motion.div>
          <h1 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800 }}>FinanceAI</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Your AI Financial Guardian</p>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 0: Welcome */}
          {step === 0 && (
            <motion.div key="welcome"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="onboarding-step"
            >
              <div className="step-icon-big" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,0.3), rgba(139,92,246,0.3))' }}>
                <Sparkles size={40} color="#60a5fa" />
              </div>
              <h2>Welcome to FinanceAI</h2>
              <p className="step-desc">
                I'm your AI-powered financial guardian. I'll help you manage your money, plan investments, 
                and achieve your financial goals — all personalized to your life.
              </p>
              <div className="feature-list">
                {['📊 Smart budget planning', '📈 Investment insights with stock graphs', '🎯 Goal tracking', '🤖 AI-powered advice'].map(f => (
                  <div key={f} className="feature-item">
                    <Check size={14} color="#10b981" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <motion.button
                className="btn btn-primary btn-lg"
                onClick={() => setStep(1)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Get Started <ArrowRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 1: Name */}
          {step === 1 && (
            <motion.div key="name"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="onboarding-step"
            >
              <div className="step-icon-big">
                <User size={36} color="#60a5fa" />
              </div>
              <h2>What's your name?</h2>
              <p className="step-desc">Let's personalize your experience</p>
              <input
                className="input-glass"
                style={{ fontSize: '1.1rem', padding: '14px 16px', marginTop: 8 }}
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNameStep()}
                autoFocus
              />
              <motion.button
                className="btn btn-primary btn-lg"
                onClick={handleNameStep}
                disabled={loading || !name.trim()}
                whileHover={{ scale: 1.02 }}
                style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
              >
                {loading ? <><div className="spinner" style={{width:18,height:18}}/> Setting up...</> : <>Continue <ChevronRight size={18} /></>}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 2: Income */}
          {step === 2 && (
            <motion.div key="income"
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="onboarding-step"
            >
              <div className="step-icon-big">
                <DollarSign size={36} color="#10b981" />
              </div>
              <h2>What's your income?</h2>
              <p className="step-desc">Enter how much you earn and how often</p>

              <div style={{ position: 'relative', marginTop: 8 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', color: '#60a5fa', fontWeight: 700 }}>₹</span>
                <input
                  className="input-glass"
                  style={{ fontSize: '1.3rem', padding: '14px 16px 14px 34px', fontWeight: 700 }}
                  placeholder="50,000"
                  type="number"
                  value={income}
                  onChange={(e) => setIncomeVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleIncomeStep()}
                  autoFocus
                />
              </div>

              <div className="freq-grid" style={{ marginTop: 14 }}>
                {FREQUENCIES.map(f => (
                  <button
                    key={f.value}
                    className={`freq-btn ${frequency === f.value ? 'active' : ''}`}
                    onClick={() => setFrequency(f.value)}
                  >
                    <span>{f.icon}</span>
                    <span style={{ fontWeight: 600 }}>{f.label}</span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{f.desc}</span>
                  </button>
                ))}
              </div>

              {income && monthlyEquivalent > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card-sm"
                  style={{ padding: '12px 16px', marginTop: 12, borderColor: 'rgba(16,185,129,0.3)' }}
                >
                  <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)' }}>Monthly equivalent: </span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>₹{monthlyEquivalent.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                </motion.div>
              )}

              <motion.button
                className="btn btn-primary btn-lg"
                onClick={handleIncomeStep}
                disabled={loading || !income}
                whileHover={{ scale: 1.02 }}
                style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}
              >
                {loading ? <><div className="spinner" style={{width:18,height:18}}/> Saving...</> : <>Continue <ChevronRight size={18} /></>}
              </motion.button>
            </motion.div>
          )}

          {/* STEP 3: Questions */}
          {step === 3 && questions.length > 0 && (
            <motion.div key={`q-${currentQ}`}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              className="onboarding-step"
            >
              {/* Progress */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                  <span>Setting up your profile</span>
                  <span>{currentQ + 1} / {questions.length}</span>
                </div>
                <div className="progress-bar">
                  <motion.div
                    className="progress-fill"
                    animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="step-icon-big" style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))' }}>
                🤔
              </div>

              <h2 style={{ fontSize: '1.1rem' }}>{questions[currentQ]?.question}</h2>
              <p className="step-desc" style={{ fontSize: '0.8rem' }}>This is stored once and remembered • Skip if not applicable</p>

              <div style={{ position: 'relative', marginTop: 8 }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#60a5fa', fontWeight: 700 }}>₹</span>
                <input
                  className="input-glass"
                  style={{ fontSize: '1.1rem', padding: '12px 16px 12px 30px' }}
                  placeholder="Enter amount (0 if none)"
                  type="number"
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnswer()}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  className="btn btn-glass"
                  onClick={handleSkip}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Skip
                </button>
                <motion.button
                  className="btn btn-primary"
                  onClick={handleAnswer}
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  style={{ flex: 2, justifyContent: 'center' }}
                >
                  {loading ? <div className="spinner" style={{width:16,height:16}}/> :
                    currentQ + 1 === questions.length ? '✅ Finish Setup' : <>Next <ChevronRight size={16} /></>
                  }
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

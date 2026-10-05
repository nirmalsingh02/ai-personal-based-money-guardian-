import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Sparkles } from 'lucide-react'

import Sidebar from './components/Layout/Sidebar'
import Dashboard from './components/Dashboard/Dashboard'
import DailyNeeds from './components/DailyNeeds/DailyNeeds'
import Investment from './components/Investment/Investment'
import FutureGoals from './components/FutureGoals/FutureGoals'
import Onboarding from './components/Onboarding/Onboarding'
import Chat from './components/Chat/Chat'
import useFinancialStore from './store/financialStore'

export default function App() {
  const { onboardingComplete, sidebarOpen } = useFinancialStore()
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <BrowserRouter>
      {!onboardingComplete ? (
        <Onboarding />
      ) : (
        <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />

          {/* Main Content Area */}
          <main
            className="main-content"
            style={{
              flex: 1,
              marginLeft: sidebarOpen ? 260 : 72,
              transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              padding: '28px 32px 60px',
              minHeight: '100vh',
              position: 'relative'
            }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/daily-needs" element={<DailyNeeds />} />
              <Route path="/investment" element={<Investment />} />
              <Route path="/goals" element={<FutureGoals />} />
              <Route path="/chat" element={<Chat isFloating={false} />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Floating AI Chat Assistant Toggle Button */}
            <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9998 }}>
              {!chatOpen && (
                <motion.button
                  onClick={() => setChatOpen(true)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 22px',
                    borderRadius: 30,
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    boxShadow: '0 10px 30px rgba(37, 99, 235, 0.45), 0 0 20px rgba(124, 58, 237, 0.35)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: '0.95rem'
                  }}
                >
                  <Sparkles size={18} />
                  <span>Ask Guardian AI</span>
                </motion.button>
              )}

              <AnimatePresence>
                {chatOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Chat isFloating={true} onClose={() => setChatOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </main>
        </div>
      )}
    </BrowserRouter>
  )
}

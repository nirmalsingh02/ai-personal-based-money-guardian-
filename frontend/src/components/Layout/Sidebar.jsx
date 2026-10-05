import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, Target, ShoppingBag,
  MessageCircle, ChevronLeft, ChevronRight, Sparkles,
  Wallet, Settings, Bell
} from 'lucide-react'
import useFinancialStore from '../../store/financialStore'
import './Sidebar.css'

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', color: '#60a5fa' },
  { path: '/daily-needs', icon: ShoppingBag, label: 'Daily Needs', color: '#34d399' },
  { path: '/investment', icon: TrendingUp, label: 'Investment', color: '#f59e0b' },
  { path: '/goals', icon: Target, label: 'Future Goals', color: '#a78bfa' },
  { path: '/chat', icon: MessageCircle, label: 'AI Assistant', color: '#f472b6' },
]

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, userName, monthlyIncome, formatCurrency } = useFinancialStore()
  const location = useLocation()

  return (
    <motion.aside
      className="sidebar"
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon pulse-glow">
          <Sparkles size={20} color="#60a5fa" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              className="logo-text"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <span className="gradient-text">FinanceAI</span>
              <span className="logo-sub">Guardian</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User Profile Card */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="sidebar-profile glass-card-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="profile-avatar">
              <Wallet size={18} color="#60a5fa" />
            </div>
            <div className="profile-info">
              <div className="profile-name">{userName}</div>
              <div className="profile-income">
                {monthlyIncome > 0 ? formatCurrency(monthlyIncome) + '/mo' : 'Set income →'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{ '--item-color': item.color }}
            >
              <motion.div
                className="nav-icon"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={20} />
              </motion.div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span
                    className="nav-label"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  className="nav-active-indicator"
                  layoutId="activeIndicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        <motion.div animate={{ rotate: sidebarOpen ? 0 : 180 }} transition={{ duration: 0.3 }}>
          <ChevronLeft size={16} />
        </motion.div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}
            >
              Collapse
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </motion.aside>
  )
}

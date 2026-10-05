import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', style = {}, onClick, hover = true, glow = false }) {
  return (
    <motion.div
      className={`glass-card ${hover ? '' : 'no-hover'} ${glow ? 'pulse-glow' : ''} ${className}`}
      style={{ padding: '24px', ...style }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      onClick={onClick}
      whileHover={hover ? { y: -3, scale: 1.01 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
    >
      {children}
    </motion.div>
  )
}

export function StatCard({ title, value, subtitle, icon: Icon, color = '#60a5fa', trend, trendLabel }) {
  const isPositive = trend >= 0

  return (
    <motion.div
      className="glass-card stat-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.3 }}
      style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
    >
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: color,
        opacity: 0.08,
        filter: 'blur(20px)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            {title}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>

        {Icon && (
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: `${color}20`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Icon size={20} color={color} />
          </div>
        )}
      </div>

      {trend !== undefined && (
        <div style={{
          marginTop: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: '0.78rem',
          color: isPositive ? '#10b981' : '#ef4444'
        }}>
          <span>{isPositive ? '▲' : '▼'} {Math.abs(trend)}%</span>
          {trendLabel && <span style={{ color: 'rgba(255,255,255,0.4)' }}>{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}

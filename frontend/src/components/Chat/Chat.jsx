import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Trash2, Sparkles, X, Minimize2, Maximize2, RefreshCw } from 'lucide-react'
import { chatApi } from '../../services/api'
import useFinancialStore from '../../store/financialStore'
import ReactMarkdown from 'react-markdown'
import './Chat.css'

const QUICK_PROMPTS = [
  'How can I save more this month?',
  'Am I spending too much on food?',
  'What stock should I invest in right now?',
  'How much emergency fund do I need?',
  'Give me a 50-30-20 budget plan',
]

export default function Chat({ isFloating = false, onClose = null }) {
  const { userId, user } = useFinancialStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchHistory()
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchHistory = async () => {
    try {
      const res = await chatApi.history(userId, { limit: 50 })
      if (res.data && res.data.length > 0) {
        setMessages(res.data)
      } else {
        setMessages([
          {
            role: 'assistant',
            content: `Hello ${user?.name || 'there'}! 👋 I am your **AI Financial Guardian**.\n\nI can help you:\n- Analyze daily spending and see profit vs loss\n- Recommend tailored stock and ETF investments\n- Create personalized savings strategies for your goals\n\nWhat would you like to explore today?`
          }
        ])
      }
    } catch (e) {
      setMessages([
        {
          role: 'assistant',
          content: `Hello ${user?.name || 'there'}! 👋 I am your **AI Financial Guardian**.\n\nHow can I help optimize your money today?`
        }
      ])
    }
  }

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg = { role: 'user', content: query }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatApi.message({
        user_id: userId,
        message: query,
        context_type: 'general',
      })

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: res.data.response }
      ])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ I had trouble connecting to the AI guardian service. Please check your Groq API key and try again.'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await chatApi.clearHistory(userId)
      setMessages([
        {
          role: 'assistant',
          content: 'Conversation history cleared. How can I assist you with your finances today?'
        }
      ])
    } catch (e) {}
  }

  return (
    <div className={`chat-wrapper ${isFloating ? 'floating-chat' : 'full-chat'}`}>
      {/* Chat Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="bot-avatar-glow">
            <Sparkles size={16} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>AI Financial Guardian</div>
            <div style={{ fontSize: '0.72rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="online-dot" /> Online • Powered by Groq
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            className="chat-icon-btn"
            title="Clear Chat"
            onClick={handleClear}
          >
            <Trash2 size={15} />
          </button>
          {isFloating && (
            <>
              <button
                className="chat-icon-btn"
                onClick={() => setMinimized(!minimized)}
              >
                {minimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
              </button>
              {onClose && (
                <button
                  className="chat-icon-btn"
                  onClick={onClose}
                >
                  <X size={15} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages list */}
          <div className="chat-messages">
            {messages.map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`message-bubble-row ${m.role === 'user' ? 'user-row' : 'bot-row'}`}
              >
                {m.role !== 'user' && (
                  <div className="msg-avatar bot-avatar">
                    <Bot size={15} color="#3b82f6" />
                  </div>
                )}
                <div className={`message-bubble ${m.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}>
                  {m.role === 'assistant' ? (
                    <div className="ai-markdown">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span>{m.content}</span>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="msg-avatar user-avatar">
                    <User size={15} color="#fff" />
                  </div>
                )}
              </motion.div>
            ))}

            {loading && (
              <div className="message-bubble-row bot-row">
                <div className="msg-avatar bot-avatar">
                  <Bot size={15} color="#3b82f6" />
                </div>
                <div className="message-bubble bot-bubble typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompt suggestions */}
          <div className="quick-prompts-bar">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                className="quick-chip"
                onClick={() => handleSend(p)}
                disabled={loading}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <form
            className="chat-input-area"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            <input
              type="text"
              className="chat-input"
              placeholder="Ask anything about your money, budget, stocks..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || !input.trim()}
            >
              <Send size={16} />
            </button>
          </form>
        </>
      )}
    </div>
  )
}

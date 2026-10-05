import axios from 'axios'
import toast from 'react-hot-toast'

const BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Something went wrong'
    toast.error(msg)
    return Promise.reject(err)
  }
)

// ─── User / Auth ───────────────────────────────────────
export const userApi = {
  create: (data) => api.post('/api/user/create', data),
  get: (userId) => api.get(`/api/user/${userId}`),
  setIncome: (data) => api.post('/api/user/income', data),
  status: (userId) => api.get(`/api/user/${userId}/status`),
}

// ─── Onboarding ────────────────────────────────────────
export const onboardingApi = {
  getQuestions: () => api.get('/api/onboarding/questions'),
  submit: (data) => api.post('/api/onboarding/submit', data),
  getData: (userId) => api.get(`/api/onboarding/${userId}`),
  nextAiQuestion: (data) => api.post('/api/onboarding/ai-next-question', data),
}

// ─── Transactions ──────────────────────────────────────
export const transactionApi = {
  create: (data) => api.post('/api/transactions/', data),
  list: (userId, params) => api.get(`/api/transactions/${userId}`, { params }),
  delete: (id, userId) => api.delete(`/api/transactions/${id}`, { params: { user_id: userId } }),
  summary: (userId, params) => api.get(`/api/transactions/${userId}/summary`, { params }),
  aiAnalysis: (userId, params) => api.post(`/api/transactions/${userId}/ai-analysis`, {}, { params }),
}

// ─── Investment ────────────────────────────────────────
export const investmentApi = {
  suggested: (userId) => api.get(`/api/investment/suggested/${userId}`),
  stock: (symbol, period) => api.get(`/api/investment/stock/${symbol}`, { params: { period } }),
  multiple: (symbols) => api.get('/api/investment/stocks/multiple', { params: { symbols: symbols.join(',') } }),
  search: (query) => api.get(`/api/investment/search/${query}`),
  aiAdvice: (data) => api.post('/api/investment/ai-advice', data),
  popularStocks: () => api.get('/api/investment/popular-stocks'),
}

// ─── Goals ─────────────────────────────────────────────
export const goalsApi = {
  create: (data) => api.post('/api/goals/', data),
  list: (userId, includeCompleted) => api.get(`/api/goals/${userId}`, { params: { include_completed: includeCompleted } }),
  update: (id, userId, data) => api.patch(`/api/goals/${id}`, data, { params: { user_id: userId } }),
  delete: (id, userId) => api.delete(`/api/goals/${id}`, { params: { user_id: userId } }),
  aiAdvice: (id, userId) => api.post(`/api/goals/${id}/ai-advice`, {}, { params: { user_id: userId } }),
}

// ─── Chat ──────────────────────────────────────────────
export const chatApi = {
  message: (data) => api.post('/api/chat/message', data),
  history: (userId, params) => api.get(`/api/chat/history/${userId}`, { params }),
  clearHistory: (userId, contextType) => api.delete(`/api/chat/history/${userId}`, { params: { context_type: contextType } }),
}

export default api

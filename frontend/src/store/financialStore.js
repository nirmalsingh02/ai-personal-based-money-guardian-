import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { userApi, transactionApi, goalsApi } from '../services/api'

const useFinancialStore = create(
  persist(
    (set, get) => ({
      // ─── User ───────────────────────────────────────
      userId: 'user_001',  // Default single user
      userName: 'My Finance',
      userProfile: null,
      onboardingComplete: false,
      hasIncome: false,

      setUserId: (id) => set({ userId: id }),
      setUserName: (name) => set({ userName: name }),
      setOnboardingComplete: (val) => set({ onboardingComplete: val }),

      // ─── Income ─────────────────────────────────────
      income: null,
      incomeFrequency: 'monthly',
      monthlyIncome: 0,

      setIncome: (amount, frequency) => {
        let monthly = amount
        if (frequency === 'weekly') monthly = amount * 4.33
        if (frequency === 'yearly') monthly = amount / 12
        set({ income: amount, incomeFrequency: frequency, monthlyIncome: Math.round(monthly) })
      },

      // ─── Budget Summary ─────────────────────────────
      summary: null,
      summaryLoading: false,

      fetchSummary: async () => {
        const { userId } = get()
        set({ summaryLoading: true })
        try {
          const res = await transactionApi.summary(userId)
          set({ summary: res.data })
        } catch (e) {
          console.error('Summary fetch error:', e)
        } finally {
          set({ summaryLoading: false })
        }
      },

      // ─── Transactions ────────────────────────────────
      transactions: [],
      transactionsLoading: false,

      fetchTransactions: async (month, year) => {
        const { userId } = get()
        set({ transactionsLoading: true })
        try {
          const now = new Date()
          const res = await transactionApi.list(userId, {
            month: month || now.getMonth() + 1,
            year: year || now.getFullYear(),
            limit: 100
          })
          set({ transactions: res.data.transactions || [] })
        } catch (e) {
          console.error('Transaction fetch error:', e)
        } finally {
          set({ transactionsLoading: false })
        }
      },

      addTransaction: (tx) => {
        set(state => ({ transactions: [tx, ...state.transactions] }))
        get().fetchSummary()
      },

      removeTransaction: (id) => {
        set(state => ({ transactions: state.transactions.filter(t => t.id !== id) }))
        get().fetchSummary()
      },

      // ─── Goals ──────────────────────────────────────
      goals: [],
      goalsLoading: false,

      fetchGoals: async () => {
        const { userId } = get()
        set({ goalsLoading: true })
        try {
          const res = await goalsApi.list(userId, false)
          set({ goals: res.data.goals || [] })
        } catch (e) {
          console.error('Goals fetch error:', e)
        } finally {
          set({ goalsLoading: false })
        }
      },

      // ─── UI State ───────────────────────────────────
      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      // ─── Format helpers ─────────────────────────────
      formatCurrency: (amount) => {
        if (amount === null || amount === undefined) return '₹0'
        const abs = Math.abs(amount)
        if (abs >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
        if (abs >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
        if (abs >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
        return `₹${amount.toLocaleString('en-IN')}`
      },

      formatCurrencyFull: (amount) => {
        if (amount === null || amount === undefined) return '₹0'
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0
        }).format(amount)
      },
    }),
    {
      name: 'ai-financial-store',
      partialize: (state) => ({
        userId: state.userId,
        userName: state.userName,
        income: state.income,
        incomeFrequency: state.incomeFrequency,
        monthlyIncome: state.monthlyIncome,
        onboardingComplete: state.onboardingComplete,
        hasIncome: state.hasIncome,
      })
    }
  )
)

export default useFinancialStore

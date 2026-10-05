import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'rgba(10,22,40,0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white',
          fontFamily: 'Outfit, sans-serif',
          borderRadius: '12px',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: 'white' }
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: 'white' }
        }
      }}
    />
  </React.StrictMode>,
)

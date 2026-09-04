import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { seedDemoData } from './db/operations'

// Initialize demo data on first run
seedDemoData().catch(console.error)

// Apply initial theme
const savedStore = localStorage.getItem('lifemap-app-store')
if (savedStore) {
  try {
    const { state } = JSON.parse(savedStore)
    if (state?.theme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  } catch { document.documentElement.classList.add('dark') }
} else {
  document.documentElement.classList.add('dark')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

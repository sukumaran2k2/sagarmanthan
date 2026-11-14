import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './api' // token and session refresh for every backend call
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import { dropSharedTokens } from './utils/tabSession'

dropSharedTokens()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)

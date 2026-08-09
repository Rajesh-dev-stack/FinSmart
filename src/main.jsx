import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeProvider.jsx'
import { RewardsProvider } from './context/RewardsProvider.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <RewardsProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </RewardsProvider>
    </ThemeProvider>
  </StrictMode>,
)

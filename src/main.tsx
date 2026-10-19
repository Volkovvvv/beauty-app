import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { initTelegram } from './shared/api/telegram'
import './shared/ui/styles/global.css'

// ready() до первого рендера — Telegram показывает приложение сразу, без заглушки
initTelegram()

const root = document.getElementById('root')
if (!root) throw new Error('Нет #root в index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)

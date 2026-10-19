import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devTelegramLogin from './tools/vite-dev-telegram-login'

// base: './' — относительные пути, сборка работает и в корне домена, и в подпапке
export default defineConfig({
  plugins: [react(), devTelegramLogin()],
  base: './',
  // 5173 обычно занят фронтом репетиторов (saas) — у мастеров свой порт
  server: { port: 5174, strictPort: true },
})

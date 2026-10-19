import { useEffect } from 'react'
import s from './Toast.module.css'

// Короткое уведомление над нижней панелью, само прячется через пару секунд
export default function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  useEffect(() => {
    if (!message) return undefined
    const t = setTimeout(onHide, 2600)
    return () => clearTimeout(t)
  }, [message, onHide])

  if (!message) return null
  return (
    <div className={s.toast} role="status" onClick={onHide}>
      {message}
    </div>
  )
}

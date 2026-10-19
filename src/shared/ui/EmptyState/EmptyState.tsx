import type { ReactNode } from 'react'
import s from './EmptyState.module.css'

// Пустое состояние внутри секции: короткий текст и, если есть, действие
export default function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={s.empty}>
      <span>{children}</span>
      {action}
    </div>
  )
}

import type { ReactNode } from 'react'
import s from './TextAction.module.css'

// Текстовое действие вишнёвым: «Открыть календарь», «Сменить», «+ Фото»
export default function TextAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={s.action} onClick={onClick}>
      {children}
    </button>
  )
}

import { useEffect, type ReactNode } from 'react'
import Title from '../Title/Title'
import s from './Sheet.module.css'

interface SheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

// Нижняя шторка поверх экрана. Закрывается тапом по затемнению и Escape
export default function Sheet({ title, onClose, children }: SheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className={s.backdrop} onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <span className={s.grip} />
        <Title size="md" as="h2">{title}</Title>
        {children}
      </div>
    </>
  )
}

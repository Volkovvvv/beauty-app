import type { CSSProperties, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import s from './Layout.module.css'

// Корневая оболочка: ширина и отступы. Снизу место под меню или панель действий
export function AppShell({ children }: { children: ReactNode }) {
  return <div className={s.shell}>{children}</div>
}

interface StackProps {
  gap?: number
  className?: string
  children: ReactNode
}

// Вертикальный стек с равными промежутками. Отступы между блоками
// задаёт родитель, а не сами блоки — компоненты не знают о соседях.
export function Stack({ gap = 10, className, children }: StackProps) {
  return (
    <div className={cx(s.stack, className)} style={{ '--gap': `${gap}px` } as CSSProperties}>
      {children}
    </div>
  )
}

// Корень экрана: крупные блоки идут через 18px
export function Screen({ children }: { children: ReactNode }) {
  return <Stack gap={18}>{children}</Stack>
}

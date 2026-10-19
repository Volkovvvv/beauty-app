import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import s from './IconButton.module.css'

interface IconButtonProps {
  label: string
  /** 'glass' — на фоне, 'white' — сплошная, 'dark' — главное действие */
  variant?: 'glass' | 'white' | 'dark'
  onClick?: () => void
  children: ReactNode
}

// Круглая кнопка 44px: назад, листание недели, «ещё»
export default function IconButton({ label, variant = 'glass', onClick, children }: IconButtonProps) {
  return (
    <button type="button" aria-label={label} className={cx(s.btn, s[variant])} onClick={onClick}>
      {children}
    </button>
  )
}

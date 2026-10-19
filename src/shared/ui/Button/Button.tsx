import type { MouseEvent, ReactNode } from 'react'
import { cx } from '../../lib/cx'
import s from './Button.module.css'

interface ButtonProps {
  /** 'cherry' — главное действие, 'pearl' — светлая на вишне и тёмном,
   *  'soft' — второстепенная на белом, 'glass' — второстепенная на фоне */
  variant?: 'cherry' | 'dark' | 'pearl' | 'soft' | 'glass'
  /** 'lg' 54px, 'md' 48px, 'sm' 40px, 'xs' 36px */
  size?: 'lg' | 'md' | 'sm' | 'xs'
  /** Растянуть на свободное место в ряду */
  wide?: boolean
  disabled?: boolean
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  children: ReactNode
}

// Кнопка-пилюля
export default function Button({ variant = 'cherry', size = 'md', wide = false, disabled = false, onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(s.btn, s[variant], s[size], wide && s.wide)}
    >
      {children}
    </button>
  )
}

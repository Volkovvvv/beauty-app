import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import s from './Title.module.css'

interface TitleProps {
  /** 'xl' — экран, 'lg' — вложенный экран, 'md' — секция */
  size?: 'xl' | 'lg' | 'md'
  as?: 'h1' | 'h2' | 'h3'
  className?: string
  children: ReactNode
}

// Заголовок антиквой
export default function Title({ size = 'xl', as: Tag = 'h1', className, children }: TitleProps) {
  return <Tag className={cx(s.title, s[size], className)}>{children}</Tag>
}

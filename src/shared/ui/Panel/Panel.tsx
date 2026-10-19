import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import s from './Panel.module.css'

interface PanelProps {
  /** Строки внутри разделяются тонкой линией, отступы только по бокам */
  list?: boolean
  children: ReactNode
}

// Белая карточка
export default function Panel({ list = false, children }: PanelProps) {
  return <div className={cx(s.panel, list ? s.list : s.box)}>{children}</div>
}

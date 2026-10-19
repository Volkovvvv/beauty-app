import type { ReactNode } from 'react'
import { cx } from '../../../shared/lib/cx'
import s from './TimelineRow.module.css'

interface TimelineRowProps {
  time: string
  title: string
  subtitle: string
  /** Цена справа */
  aside?: ReactNode
  /** Кнопка справа вместо цены */
  action?: ReactNode
  /** Пунктирная карточка свободного окна */
  window?: boolean
  /** Приглушить прошедшую запись */
  dim?: boolean
  onClick?: () => void
}

// Строка ленты дня: время слева и карточка записи или свободного окна
export default function TimelineRow({ time, title, subtitle, aside, action, window = false, dim = false, onClick }: TimelineRowProps) {
  return (
    <div className={s.row}>
      <span className={s.time}>{time}</span>
      <div
        className={cx(s.card, window && s.window, dim && s.dim, onClick && s.tappable)}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      >
        <div className={s.text}>
          <span className={s.title}>{title}</span>
          <span className={s.subtitle}>{subtitle}</span>
        </div>
        {action}
        {aside ? <span className={s.aside}>{aside}</span> : null}
      </div>
    </div>
  )
}

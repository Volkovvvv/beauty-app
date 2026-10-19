import type { ReactNode } from 'react'
import { Avatar } from '../../../shared/ui'
import { cx } from '../../../shared/lib/cx'
import { initials, type Client } from '../model/client'
import s from './ClientRow.module.css'

interface ClientRowProps {
  client: Client
  hint: string
  /** Подсказка вишнёвым («пора на коррекцию») */
  accent?: boolean
  aside?: ReactNode
  onClick?: () => void
}

// Строка клиентки: инициалы, имя, подсказка и действие справа.
// С действием справа строка — div с role="button": кнопку в кнопку вкладывать нельзя
export default function ClientRow({ client, hint, accent = false, aside, onClick }: ClientRowProps) {
  return (
    <div
      className={cx(s.row, onClick && s.tappable)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <Avatar text={initials(client.name)} tone="rose" />
      <span className={s.text}>
        <span className={s.name}>{client.name}</span>
        <span className={cx(s.hint, accent && s.accent)}>{hint}</span>
      </span>
      {aside}
    </div>
  )
}

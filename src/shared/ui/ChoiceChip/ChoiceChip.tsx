import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import s from './ChoiceChip.module.css'

interface ChoiceChipProps {
  selected: boolean
  onToggle: () => void
  title: string
  /** Вторая строка: длительность и цена, примеры услуг */
  meta?: ReactNode
}

// Чип выбора, как услуги в форме записи: белый, выбранный — тёмный
export default function ChoiceChip({ selected, onToggle, title, meta }: ChoiceChipProps) {
  return (
    <button type="button" aria-pressed={selected} className={cx(s.chip, selected && s.on)} onClick={onToggle}>
      <span className={s.title}>{title}</span>
      {meta ? <span className={s.meta}>{meta}</span> : null}
    </button>
  )
}

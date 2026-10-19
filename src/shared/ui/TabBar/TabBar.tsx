import type { CSSProperties } from 'react'
import { cx } from '../../lib/cx'
import s from './TabBar.module.css'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabBarProps<T extends string> {
  items: readonly TabItem<T>[]
  value: T
  onChange: (value: T) => void
}

// Нижнее меню разделов: стеклянная пилюля, под активным пунктом тёмная «капля»
export default function TabBar<T extends string>({ items, value, onChange }: TabBarProps<T>) {
  const index = Math.max(0, items.findIndex((item) => item.value === value))

  return (
    <nav
      className={s.bar}
      role="tablist"
      aria-label="Разделы"
      style={{ '--count': items.length, '--index': index } as CSSProperties}
    >
      <span className={s.thumb} aria-hidden="true" />
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={cx(s.tab, value === item.value && s.active)}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}

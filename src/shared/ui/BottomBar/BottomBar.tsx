import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import s from './BottomBar.module.css'

// Плавающая панель действий внизу вложенных экранов — на месте нижнего меню.
// dark — тёмная пилюля с итогом слева (новая запись), иначе просто ряд кнопок
export default function BottomBar({ dark = false, children }: { dark?: boolean; children: ReactNode }) {
  return <div className={cx(s.bar, dark && s.dark)}>{children}</div>
}

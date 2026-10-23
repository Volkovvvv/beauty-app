import { useEffect, useRef } from 'react'
import { cx } from '../../../shared/lib/cx'
import { dayOfMonth, weekday, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import s from './DayStrip.module.css'

export interface StripDay {
  date: ISODate
  /** Сколько записей: по точке на каждую, но не больше четырёх */
  records: number
  /** Есть свободное окно — последняя, светлая точка */
  window: boolean
}

interface DayStripProps {
  days: readonly StripDay[]
  selected: ISODate
  today: ISODate
  onPick: (date: ISODate) => void
}

const MAX_DOTS = 4

// Лента дней (макет 3a): день недели, число и точки загрузки. Выбранный день
// держится по центру — при открытии сразу, при выборе плавно
export default function DayStrip({ days, selected, today, onPick }: DayStripProps) {
  const box = useRef<HTMLDivElement>(null)
  const settled = useRef(false)

  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!box.current || !el) return
    box.current.scrollTo({
      left: el.offsetLeft - box.current.clientWidth / 2 + el.offsetWidth / 2,
      behavior: settled.current ? 'smooth' : 'auto',
    })
    settled.current = true
  }, [selected])

  return (
    <div ref={box} className={s.strip}>
      {days.map((d) => (
        <button
          key={d.date}
          type="button"
          aria-pressed={d.date === selected}
          aria-label={`${dayOfMonth(d.date)}, записей: ${d.records}${d.window ? ', есть окна' : ''}`}
          className={cx(s.day, d.date === selected ? s.on : d.date === today && s.today)}
          onClick={() => onPick(d.date)}
        >
          <span className={s.wd}>{WEEKDAYS[weekday(d.date)]}</span>
          <span className={s.num}>{dayOfMonth(d.date)}</span>
          <span className={s.dots}>
            {Array.from({ length: Math.min(d.records, MAX_DOTS) }, (_, i) => (
              <span key={i} className={s.dot} />
            ))}
            {d.window ? <span className={cx(s.dot, s.dotFree)} /> : null}
          </span>
        </button>
      ))}
    </div>
  )
}

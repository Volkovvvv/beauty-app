import { useEffect, useMemo, useState } from 'react'
import { dayAppointments, isWorkday, type Appointment, type Workday } from '../../../entities/appointment'
import { monthEnd, monthStart, monthWindows, type WindowEdits } from '../../../features/story-windows'
import { cx } from '../../../shared/lib/cx'
import { dayOfMonth, MONTHS, monthIndex, weekday, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import { count } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { IconButton } from '../../../shared/ui'
import s from './MonthCalendar.module.css'

interface MonthCalendarProps {
  appointments: readonly Appointment[]
  workday: Workday
  now: Now
  /** Ручные правки окон: «есть окно» считается так же, как в сторис и онлайн-записи */
  edits: WindowEdits
  onLoadEdits: (from: ISODate, to: ISODate) => void
  selected: ISODate
  onPick: (date: ISODate) => void
}

// Загрузка месяца: где всё занято, где есть окно, где выходной
export default function MonthCalendar({ appointments, workday, now, edits, onLoadEdits, selected, onPick }: MonthCalendarProps) {
  const [month, setMonth] = useState(() => monthStart(selected))
  const days = useMemo(() => {
    const windows = monthWindows({ appointments, workday, now, edits }, month)
    return windows.map((d) => ({ ...d, records: dayAppointments(appointments, d.date).length }))
  }, [appointments, workday, now, edits, month])

  useEffect(() => onLoadEdits(month, monthEnd(month)), [month, onLoadEdits])

  const ahead = days.filter((d) => d.date >= now.date)
  const records = ahead.reduce((n, d) => n + d.records, 0)
  const windows = ahead.reduce((n, d) => n + d.times.length, 0)

  return (
    <div className={s.panel}>
      <div className={s.head}>
        <span className={s.month}>{MONTHS[monthIndex(month)]}</span>
        <div className={s.arrows}>
          <IconButton label="Прошлый месяц" variant="white" onClick={() => setMonth((m) => monthStart(m, -1))}>‹</IconButton>
          <IconButton label="Следующий месяц" variant="white" onClick={() => setMonth((m) => monthStart(m, 1))}>›</IconButton>
        </div>
      </div>
      <div className={s.grid}>
        {WEEKDAYS.map((w) => (
          <span key={w} className={s.weekday}>{w}</span>
        ))}
        {Array.from({ length: weekday(month) }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {days.map((d) => {
          const off = !d.records && !isWorkday(workday, d.date)
          const open = !d.past && d.times.length > 0
          const sub = off ? 'вых' : open ? 'окно' : d.records ? `${d.records} зап` : ''
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={d.date === selected}
              className={cx(
                s.cell,
                off ? s.off : open ? s.open : d.records ? s.busy : null,
                d.past && s.past,
                d.date === now.date && s.today,
                d.date === selected && s.on
              )}
              onClick={() => onPick(d.date)}
            >
              <span className={s.num}>{dayOfMonth(d.date)}</span>
              <span className={s.sub}>{sub}</span>
            </button>
          )
        })}
      </div>
      <div className={s.legend}>
        <span className={s.legendItem}><span className={cx(s.swatch, s.busy)} />Всё занято</span>
        <span className={s.legendItem}><span className={cx(s.swatch, s.open)} />Есть окно</span>
        <span className={s.legendItem}><span className={cx(s.swatch, s.off)} />Выходной</span>
      </div>
      {ahead.length ? (
        <span className={s.summary}>
          {month === monthStart(now.date) ? 'До конца месяца' : 'За месяц'}: {count(records, ['запись', 'записи', 'записей'])} ·{' '}
          {count(windows, ['окно', 'окна', 'окон'])}
        </span>
      ) : null}
    </div>
  )
}

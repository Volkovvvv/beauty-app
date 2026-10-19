import { isPast, type TimelineItem, type Workday } from '../../../entities/appointment'
import { dayOfMonth, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import { cx } from '../../../shared/lib/cx'
import type { Now } from '../../../shared/lib/useNow'
import s from './WeekGrid.module.css'

// Высота часа в сетке, px — совпадает с шагом линий в WeekGrid.module.css
const HOUR = 40
const height = (minutes: number) => (minutes / 60) * HOUR - 2

export interface WeekDay {
  date: ISODate
  timeline: TimelineItem[]
}

interface WeekGridProps {
  days: readonly WeekDay[]
  selected: ISODate
  now: Now
  workday: Workday
  onSelect: (date: ISODate) => void
  /** Подпись плашки: время и имя */
  label: (item: TimelineItem) => { time: string; name: string }
}

// Неделя столбиками: каждая запись — плашка по времени, окна — пунктиром
export default function WeekGrid({ days, selected, now, workday, onSelect, label }: WeekGridProps) {
  // Шкала — целые часы рабочего дня: 10:00–21:00 → 10, 11 … 20
  const firstHour = Math.floor(workday.start / 60)
  const hours = Array.from({ length: Math.ceil(workday.end / 60) - firstHour }, (_, i) => firstHour + i)
  const top = (min: number) => (min / 60 - firstHour) * HOUR

  return (
    <div className={s.grid}>
      <div className={s.head}>
        {days.map(({ date }, i) => (
          <button
            key={date}
            type="button"
            className={cx(s.day, date === now.date && s.today, date === selected && s.selected)}
            aria-pressed={date === selected}
            onClick={() => onSelect(date)}
          >
            <span className={s.weekday}>{WEEKDAYS[i]}</span>
            <span className={s.number}>{dayOfMonth(date)}</span>
          </button>
        ))}
      </div>

      <div className={s.body} style={{ height: hours.length * HOUR }}>
        <div className={s.hours} aria-hidden="true">
          {hours.map((h, i) => (
            <span key={h} className={s.hour} style={{ top: i * HOUR }}>{h}</span>
          ))}
        </div>

        {days.map(({ date, timeline }) => (
          <button
            key={date}
            type="button"
            className={cx(s.column, date === selected && s.columnSelected)}
            aria-label={`Показать ${dayOfMonth(date)} число`}
            onClick={() => onSelect(date)}
          >
            {timeline.map((item) => {
              // Вне рабочего дня сетка не рисуется — такие записи видны в списке дня
              if (item.start >= workday.end || item.start < firstHour * 60) return null
              const isWindow = item.kind === 'window'
              const minutes = isWindow ? item.minutes : item.appointment.minutes
              const tone = isWindow
                ? s.window
                : isPast(item.appointment, now)
                  ? s.past
                  : date === selected
                    ? s.active
                    : s.booked
              const { time, name } = label(item)
              return (
                <span
                  key={isWindow ? `w${item.start}` : item.appointment.id}
                  className={cx(s.block, tone)}
                  style={{ top: top(item.start), height: height(Math.min(minutes, workday.end - item.start)) }}
                >
                  <span className={s.blockTime}>{time}</span>
                  <span className={s.blockName}>{name}</span>
                </span>
              )
            })}
          </button>
        ))}
      </div>
    </div>
  )
}

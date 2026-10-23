import { useEffect, useMemo, useState } from 'react'
import { appointmentTitle, isPast, type Appointment, type Workday } from '../../../entities/appointment'
import { shortName, type Client } from '../../../entities/client'
import type { BookingInitial } from '../../../features/add-appointment'
import { monthDay, storyWindows, windowsLabel, type WindowEdits } from '../../../features/story-windows'
import { addDays, fromMinutes, MONTHS, monthIndex, weekday, WEEKDAYS_FULL, weekStart, dayOfMonth, type ISODate } from '../../../shared/lib/date'
import { cx } from '../../../shared/lib/cx'
import { duration, rub } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { IconButton, Screen, Stack } from '../../../shared/ui'
import { dayView } from '../model/dayRows'
import DayStrip from './DayStrip'
import MonthCalendar from './MonthCalendar'
import s from './RecordsPage.module.css'

interface RecordsPageProps {
  clientById: Map<string, Client>
  appointments: readonly Appointment[]
  now: Now
  workday: Workday
  /** Ручные правки окон мастера: окна здесь те же, что в сторис и онлайн-записи */
  edits: WindowEdits
  onLoadEdits: (from: ISODate, to: ISODate) => void
  /** Выбранный день; живёт в App, чтобы переживать смену вкладок */
  date: ISODate
  onSelectDate: (date: ISODate) => void
  onOpenClient: (id: string) => void
  onBook: (initial: BookingInitial) => void
  /** Открыть «Окошки в сторис» */
  onStories: () => void
}

// Сколько дней в ленте: пять недель, выбранный день всегда внутри
const STRIP_DAYS = 35

// «Записи» (макет 3a): месяц со стрелкой, лента дней и список выбранного дня
// с окнами. Месяц раскрывается в календарь с загрузкой дней
export default function RecordsPage({
  clientById,
  appointments,
  now,
  workday,
  edits,
  onLoadEdits,
  date,
  onSelectDate,
  onOpenClient,
  onBook,
  onStories,
}: RecordsPageProps) {
  const [monthOpen, setMonthOpen] = useState(false)
  // Лента не должна «ехать» при каждом выборе дня: её начало меняется, только когда день вышел за её пределы
  const [stripFrom, setStripFrom] = useState(() => addDays(weekStart(date), -7))
  const from = date >= stripFrom && date < addDays(stripFrom, STRIP_DAYS) ? stripFrom : addDays(weekStart(date), -7)
  useEffect(() => setStripFrom(from), [from])

  const to = addDays(from, STRIP_DAYS - 1)
  useEffect(() => onLoadEdits(from, to), [from, to, onLoadEdits])

  const ctx = useMemo(() => ({ appointments, workday, now, edits }), [appointments, workday, now, edits])
  const strip = useMemo(
    () =>
      Array.from({ length: STRIP_DAYS }, (_, i) => {
        const d = addDays(from, i)
        const v = dayView(ctx, d)
        return { date: d, records: v.records, window: monthDay(ctx, d).times.length > 0 }
      }),
    [ctx, from]
  )
  const day = useMemo(() => dayView(ctx, date), [ctx, date])
  const storyCount = useMemo(() => storyWindows(ctx).days.reduce((n, d) => n + d.times.length, 0), [ctx])

  const pick = (d: ISODate) => {
    onSelectDate(d)
    setMonthOpen(false)
  }

  return (
    <Screen>
      <header className={s.header}>
        <button type="button" className={s.monthToggle} aria-expanded={monthOpen} onClick={() => setMonthOpen((v) => !v)}>
          <span className={s.month}>{MONTHS[monthIndex(date)]}</span>
          <span className={cx(s.caret, monthOpen && s.caretOpen)} aria-hidden="true">▾</span>
        </button>
        <div className={s.nav}>
          {date !== now.date ? (
            <button type="button" className={s.today} onClick={() => pick(now.date)}>
              Сегодня
            </button>
          ) : null}
          <IconButton label="Новая запись" variant="dark" onClick={() => onBook({ date })}>+</IconButton>
        </div>
      </header>

      {storyCount ? (
        <button type="button" className={s.stories} onClick={onStories}>
          <span>Окошки недели в сторис</span>
          <span className={s.storiesCount}>{windowsLabel(storyCount)}</span>
        </button>
      ) : null}

      {monthOpen ? (
        <MonthCalendar
          appointments={appointments}
          workday={workday}
          now={now}
          edits={edits}
          onLoadEdits={onLoadEdits}
          selected={date}
          onPick={pick}
        />
      ) : (
        <DayStrip days={strip} selected={date} today={now.date} onPick={onSelectDate} />
      )}

      <div className={s.dayHead}>
        <span className={s.dayTitle}>
          {WEEKDAYS_FULL[weekday(date)]}, {dayOfMonth(date)}
        </span>
        <span className={s.daySum}>{day.records ? rub(day.sum) : day.dayOff ? 'Выходной' : ''}</span>
      </div>

      <Stack gap={8}>
        {day.rows.length ? (
          day.rows.map((row) =>
            row.kind === 'window' ? (
              <div key={`w${row.start}`} className={s.row}>
                <div className={s.times}>
                  <span className={s.start}>{fromMinutes(row.start)}</span>
                  <span className={s.end}>{fromMinutes(row.end)}</span>
                </div>
                <div className={cx(s.card, s.cardFree)}>
                  <div className={s.cardText}>
                    <span className={s.free}>Свободное окно</span>
                    <span className={s.sub}>{duration(row.end - row.start)}</span>
                  </div>
                  <button type="button" className={s.book} onClick={() => onBook({ date, start: row.start })}>
                    Записать
                  </button>
                </div>
              </div>
            ) : (
              <div key={row.appointment.id} className={s.row}>
                <div className={s.times}>
                  <span className={s.start}>{fromMinutes(row.start)}</span>
                  <span className={s.end}>{fromMinutes(row.end)}</span>
                </div>
                <button
                  type="button"
                  className={cx(s.card, isPast(row.appointment, now) && s.past)}
                  onClick={() => onOpenClient(row.appointment.clientId)}
                >
                  <div className={s.cardText}>
                    <span className={s.name}>{shortName(clientById.get(row.appointment.clientId)?.name ?? 'Клиентка')}</span>
                    <span className={s.sub}>
                      {appointmentTitle(row.appointment)} · {rub(row.appointment.price)}
                    </span>
                  </div>
                </button>
              </div>
            )
          )
        ) : (
          <div className={s.row}>
            <div className={s.times} />
            <div className={cx(s.card, s.cardFree)}>
              <div className={s.cardText}>
                <span className={s.free}>{day.dayOff ? 'Выходной' : 'Записей нет'}</span>
                <span className={s.sub}>{day.dayOff ? 'Записей нет' : 'Нажмите +, чтобы записать клиентку'}</span>
              </div>
            </div>
          </div>
        )}
      </Stack>
    </Screen>
  )
}

import { useMemo } from 'react'
import {
  appointmentTitle,
  dayAppointments,
  dayTimeline,
  daySum,
  type Appointment,
  type TimelineItem,
  type Workday,
} from '../../../entities/appointment'
import { shortName, type Client } from '../../../entities/client'
import type { BookingInitial } from '../../../features/add-appointment'
import { WeekGrid } from '../../../widgets/week-grid'
import { addDays, dayOfMonth, fromMinutes, rangeLabel, weekday, WEEKDAYS_FULL, weekStart, type ISODate } from '../../../shared/lib/date'
import { count, duration, rub } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { IconButton, Panel, Screen, SectionHeader, Stack, Title } from '../../../shared/ui'
import s from './RecordsPage.module.css'

interface RecordsPageProps {
  clientById: Map<string, Client>
  appointments: readonly Appointment[]
  now: Now
  workday: Workday
  /** Выбранный день; живёт в App, чтобы переживать смену вкладок */
  date: ISODate
  onSelectDate: (date: ISODate) => void
  onOpenClient: (id: string) => void
  onBook: (initial: BookingInitial) => void
}

// «Записи»: неделя сеткой и список выбранного дня под ней
export default function RecordsPage({ clientById, appointments, now, workday, date, onSelectDate, onOpenClient, onBook }: RecordsPageProps) {
  const start = weekStart(date)

  // Зависит от начала недели, а не от выбранного дня: клик по дню внутри недели ничего не пересчитывает
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(start, i)
      const list = dayAppointments(appointments, d)
      return { date: d, list, timeline: dayTimeline(list) }
    })
    let booked = 0
    let windows = 0
    for (const d of days) {
      for (const item of d.timeline) {
        if (item.kind === 'window') windows += 1
        else booked += 1
      }
    }
    return { days, booked, windows }
  }, [appointments, start])

  const selected = week.days[weekday(date)]
  const label = (item: TimelineItem) =>
    item.kind === 'window'
      ? { time: fromMinutes(item.start), name: 'окно' }
      : { time: item.appointment.start, name: clientById.get(item.appointment.clientId)?.name.split(' ')[0] ?? '' }

  return (
    <Screen>
      <header className={s.header}>
        <Title>Записи</Title>
        <div className={s.nav}>
          <IconButton label="Прошлая неделя" onClick={() => onSelectDate(addDays(date, -7))}>‹</IconButton>
          <IconButton label="Следующая неделя" onClick={() => onSelectDate(addDays(date, 7))}>›</IconButton>
          <IconButton label="Новая запись" variant="dark" onClick={() => onBook({ date })}>+</IconButton>
        </div>
      </header>

      <div className={s.summary}>
        <span className={s.week}>{rangeLabel(start, addDays(start, 6))}</span>
        <span className={s.counts}>
          {count(week.booked, ['запись', 'записи', 'записей'])} · {count(week.windows, ['окно', 'окна', 'окон'])}
        </span>
      </div>

      <WeekGrid days={week.days} selected={date} now={now} workday={workday} onSelect={onSelectDate} label={label} />

      <Stack gap={8}>
        <SectionHeader
          title={`${WEEKDAYS_FULL[weekday(date)]}, ${dayOfMonth(date)}`}
          aside={<span className={s.money}>{selected.list.length ? rub(daySum(selected.list)) : 'Выходной'}</span>}
        />
        <Panel list>
          {selected.timeline.length ? (
            selected.timeline.map((item) =>
              item.kind === 'window' ? (
                <button key={`w${item.start}`} type="button" className={s.row} onClick={() => onBook({ date, start: item.start })}>
                  <span className={s.time}>{fromMinutes(item.start)}</span>
                  <span className={s.text}>
                    <span className={s.free}>Свободное окно</span>
                    <span className={s.sub}>{duration(item.minutes)} · записать</span>
                  </span>
                </button>
              ) : (
                <button
                  key={item.appointment.id}
                  type="button"
                  className={s.row}
                  onClick={() => onOpenClient(item.appointment.clientId)}
                >
                  <span className={s.time}>{item.appointment.start}</span>
                  <span className={s.text}>
                    <span className={s.name}>{shortName(clientById.get(item.appointment.clientId)?.name ?? 'Клиентка')}</span>
                    <span className={s.sub}>
                      {appointmentTitle(item.appointment)} · {rub(item.appointment.price)}
                    </span>
                  </span>
                </button>
              )
            )
          ) : (
            <button type="button" className={s.row} onClick={() => onBook({ date })}>
              <span className={s.time}>—</span>
              <span className={s.text}>
                <span className={s.free}>Записей нет</span>
                <span className={s.sub}>Нажмите, чтобы записать клиентку</span>
              </span>
            </button>
          )}
        </Panel>
      </Stack>
    </Screen>
  )
}

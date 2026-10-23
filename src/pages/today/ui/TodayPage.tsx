import { useMemo } from 'react'
import {
  appointmentTitle,
  byStart,
  dayAppointments,
  dayTimeline,
  daySum,
  endOf,
  isPast,
  TimelineRow,
  type Appointment,
} from '../../../entities/appointment'
import { initials, type Client } from '../../../entities/client'
import type { BookingInitial } from '../../../features/add-appointment'
import { NextAppointmentCard } from '../../../widgets/next-appointment'
import { fromMinutes, weekdayDayMonth } from '../../../shared/lib/date'
import { duration, rub } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { Avatar, Button, EmptyState, Screen, SectionHeader, Stack, StatTile, TextAction, Title } from '../../../shared/ui'
import s from './TodayPage.module.css'

// Ближайшая запись: та, что идёт сейчас, иначе первая ещё не закончившаяся сегодня,
// иначе первая в будущие дни
function pickNext(appointments: readonly Appointment[], now: Now): Appointment | null {
  let next: Appointment | null = null
  for (const a of appointments) {
    if (a.status === 'arrived') return a
    if (a.status !== 'planned' || a.date < now.date) continue
    if (a.date === now.date && endOf(a) <= now.minutes) continue
    if (!next || byStart(a, next) < 0) next = a
  }
  return next
}

function subtitle(a: Appointment): string {
  const title = appointmentTitle(a)
  if (a.status === 'done') return `${title} · готово`
  if (a.status === 'arrived') return `${title} · в кресле`
  return title
}

interface TodayPageProps {
  masterName: string
  clientById: Map<string, Client>
  appointments: readonly Appointment[]
  now: Now
  onOpenClient: (id: string) => void
  onOpenRecords: () => void
  onOpenProfile: () => void
  onArrived: (a: Appointment) => void
  onDone: (a: Appointment) => void
  onWrite: (client: Client) => void
  onBook: (initial: BookingInitial) => void
}

export default function TodayPage({
  masterName,
  clientById,
  appointments,
  now,
  onOpenClient,
  onOpenRecords,
  onOpenProfile,
  onArrived,
  onDone,
  onWrite,
  onBook,
}: TodayPageProps) {
  const today = useMemo(() => dayAppointments(appointments, now.date), [appointments, now.date])
  const timeline = useMemo(() => dayTimeline(today), [today])
  const next = useMemo(() => pickNext(appointments, now), [appointments, now])
  const nextClient = next ? clientById.get(next.clientId) : undefined

  return (
    <Screen>
      <header className={s.header}>
        <div className={s.hello}>
          <span className={s.date}>{weekdayDayMonth(now.date)}</span>
          <Title>
            Привет, <i>{masterName}</i>
          </Title>
        </div>
        <button type="button" className={s.profile} aria-label="Профиль" onClick={onOpenProfile}>
          <Avatar text={initials(masterName, 1)} size="md" />
        </button>
      </header>

      <div className={s.stats}>
        <StatTile label="Записей" value={today.length} />
        <StatTile label="Сегодня" value={rub(daySum(today))} />
      </div>

      {next && nextClient ? (
        <NextAppointmentCard
          appointment={next}
          client={nextClient}
          now={now}
          onArrived={() => onArrived(next)}
          onDone={() => onDone(next)}
          onOpen={() => onOpenClient(next.clientId)}
          onWrite={() => onWrite(nextClient)}
        />
      ) : null}

      <Stack gap={10}>
        <SectionHeader title="День" aside={<TextAction onClick={onOpenRecords}>Открыть календарь</TextAction>} />
        {timeline.length ? (
          <Stack gap={8}>
            {timeline.map((item) => {
              if (item.kind === 'window') {
                return (
                  <TimelineRow
                    key={`w${item.start}`}
                    window
                    time={fromMinutes(item.start)}
                    title="Свободное окно"
                    subtitle={`${duration(item.minutes)} свободно`}
                    onClick={() => onBook({ date: now.date, start: item.start })}
                    action={
                      <Button
                        variant="dark"
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          onBook({ date: now.date, start: item.start })
                        }}
                      >
                        Записать
                      </Button>
                    }
                  />
                )
              }
              const a = item.appointment
              return (
                <TimelineRow
                  key={a.id}
                  time={a.start}
                  title={clientById.get(a.clientId)?.name ?? 'Клиентка'}
                  subtitle={subtitle(a)}
                  aside={rub(a.price)}
                  dim={isPast(a, now)}
                  onClick={() => onOpenClient(a.clientId)}
                />
              )
            })}
          </Stack>
        ) : (
          <EmptyState
            action={
              <Button variant="dark" size="sm" onClick={() => onBook({ date: now.date })}>
                Записать клиентку
              </Button>
            }
          >
            Сегодня записей нет
          </EmptyState>
        )}
      </Stack>
    </Screen>
  )
}

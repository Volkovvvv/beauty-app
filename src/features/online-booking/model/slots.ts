import { dayAppointments, isBusy, type Appointment, type Workday } from '../../../entities/appointment'
import { monthDay, type WindowEdits } from '../../story-windows'
import { addDays, type ISODate } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'

// Записаться онлайн можно на месяц вперёд
const DAYS_AHEAD = 30

export interface BookingDay {
  date: ISODate
  /** Начала, на которые встаёт выбранный набор услуг, минуты от полуночи */
  times: number[]
}

/**
 * Время для клиентки — из окошек мастера (с ручными правками), но только то,
 * куда помещаются выбранные услуги целиком и что заканчивается до конца дня.
 */
export function bookingDays(
  appointments: readonly Appointment[],
  workday: Workday,
  now: Now,
  edits: WindowEdits,
  minutes: number
): BookingDay[] {
  const ctx = { appointments, workday, now, edits }
  return Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const date = addDays(now.date, i)
    const day = dayAppointments(appointments, date)
    const length = Math.max(minutes, 60)
    const times = monthDay(ctx, date).times.filter((t) => t + length <= workday.end && !isBusy(day, t, length))
    return { date, times }
  })
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Файл .ics с визитом: телефон сам предложит добавить его в календарь */
export function calendarFile(date: ISODate, start: number, minutes: number, title: string, location: string): Blob {
  const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`
  const from = new Date(`${date}T${pad(Math.floor(start / 60))}:${pad(start % 60)}:00`)
  const to = new Date(from.getTime() + minutes * 60_000)
  // Запятые и точки с запятой в тексте .ics экранируются
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//beauty-crm//online-booking//RU',
    'BEGIN:VEVENT',
    `UID:${from.getTime()}-${Math.random().toString(36).slice(2)}@beauty-crm`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(from)}`,
    `DTEND:${stamp(to)}`,
    `SUMMARY:${esc(title)}`,
    ...(location ? [`LOCATION:${esc(location)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return new Blob([lines.join('\r\n')], { type: 'text/calendar' })
}

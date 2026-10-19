import { dayAppointments, isBusy, type Appointment, type Workday } from '../../../entities/appointment'
import { addDays, daysBetween, type ISODate } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'

const STEP = 30
const DAYS_SHOWN = 6

export interface Slot {
  start: number
  busy: boolean
}

/** Шесть дней подряд с сегодняшнего, а если запись открыли на день дальше — с него */
export function pickableDays(today: ISODate, date: ISODate): ISODate[] {
  const start = daysBetween(today, date) >= DAYS_SHOWN ? date : today
  return Array.from({ length: DAYS_SHOWN }, (_, i) => addDays(start, i))
}

interface SlotsInput {
  appointments: readonly Appointment[]
  date: ISODate
  minutes: number
  now: Now
  workday: Workday
  /** Переносимая запись — её время считается свободным */
  ignoreId?: string
  /** Время окна, с которого открыли запись: окно начинается в конце
   *  предыдущей записи и в сетку по полчаса может не попасть */
  extra?: number
}

// Слоты дня по сетке в полчаса. Слот занят, если запись нужной длины
// пересечётся с другой, не влезет до конца дня или уже прошла.
export function daySlots({ appointments, date, minutes, now, workday, ignoreId, extra }: SlotsInput): Slot[] {
  const day = dayAppointments(appointments, date)
  const times = new Set<number>()
  for (let t = workday.start; t < workday.end; t += STEP) times.add(t)
  if (extra != null) times.add(extra)

  const length = Math.max(minutes, STEP)
  return [...times]
    .sort((a, b) => a - b)
    .map((start) => ({
      start,
      busy:
        date < now.date ||
        (date === now.date && start <= now.minutes) ||
        start + length > workday.end ||
        isBusy(day, start, length, ignoreId),
    }))
}

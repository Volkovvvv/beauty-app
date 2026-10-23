import { dayAppointments, endOf, isWorkday, startOf, type Appointment, type Workday } from '../../../entities/appointment'
import { addDays, dayOfMonth, rangeLabel, weekday, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import { count } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'

/** Неделя — одна сторис из шторки, месяц — серия по неделям (экран окон месяца) */
export type StoryPeriod = 'week' | 'month'

export interface StoryDay {
  date: ISODate
  /** «Чт 22» */
  label: string
  /** Начала свободных окон, минуты от полуночи */
  times: number[]
}

export interface StoryWindows {
  /** «22–28 октября», «22 окт – 20 нояб» */
  range: string
  days: StoryDay[]
}

const WEEK = 7

// Окно короче часа клиентке не предложишь — как и в ленте дня
const MIN_WINDOW = 60

/** Ключ окна для отметок «убрать из сторис» */
export const windowKey = (date: ISODate, start: number): string => `${date}@${start}`

export const windowsLabel = (n: number): string => count(n, ['окно', 'окна', 'окон'])

// Свободные промежутки рабочего дня от часа: утро до первой записи,
// между записями, вечер после последней. Сегодня — только то, что ещё впереди.
function dayWindows(list: readonly Appointment[], workday: Workday, from: number): number[] {
  const starts: number[] = []
  let cursor = Math.max(workday.start, from)
  for (const a of list) {
    if (startOf(a) - cursor >= MIN_WINDOW) starts.push(cursor)
    cursor = Math.max(cursor, endOf(a))
  }
  if (workday.end - cursor >= MIN_WINDOW) starts.push(cursor)
  return starts
}

// Сегодняшние окна начинаются не раньше ближайшего получаса
const roundUp = (minutes: number) => Math.ceil(minutes / 30) * 30

/** Свободные окна на неделю вперёд, начиная с сегодня; выходные по графику пропускаются */
export function storyWindows(appointments: readonly Appointment[], workday: Workday, now: Now): StoryWindows {
  const dates = Array.from({ length: WEEK }, (_, i) => addDays(now.date, i))
  const days = dates
    .filter((date) => isWorkday(workday, date))
    .map((date) => ({
      date,
      label: `${WEEKDAYS[weekday(date)]} ${dayOfMonth(date)}`,
      times: dayWindows(dayAppointments(appointments, date), workday, date === now.date ? roundUp(now.minutes) : 0),
    }))
    .filter((d) => d.times.length)
  return { range: rangeLabel(dates[0], dates[dates.length - 1]), days }
}

/** Только окна, которые мастер не убрал */
export function visibleDays(days: readonly StoryDay[], off: ReadonlySet<string>): StoryDay[] {
  return days
    .map((d) => ({ ...d, times: d.times.filter((t) => !off.has(windowKey(d.date, t))) }))
    .filter((d) => d.times.length)
}

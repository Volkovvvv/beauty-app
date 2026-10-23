import { dayAppointments, isBusy, isWorkday, type Appointment, type Workday } from '../../../entities/appointment'
import { addDays, fromISO, rangeLabel, toISO, weekStart, type ISODate } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'

// Окно на месяц — свободный час: клиентке в сторис предлагают «11:00», а не промежуток
const SLOT = 60
// Сторис в серии — по неделе на каждую, но не больше четырёх
const MAX_PAGES = 4

/** Ручная правка дня: часы сверх расчёта и убранные из него (минуты от полуночи) */
export interface WindowEdit {
  add: readonly number[]
  rem: readonly number[]
}

export type WindowEdits = Readonly<Record<ISODate, WindowEdit>>

/**
 * auto — свободно по расписанию, added — добавлено вручную, removed — убрано вручную,
 * free — нерабочий час, можно добавить, booked — занято записью, past — уже прошло
 */
export type SlotState = 'auto' | 'added' | 'removed' | 'free' | 'booked' | 'past'

export interface HourSlot {
  start: number
  state: SlotState
}

export interface MonthDay {
  date: ISODate
  /** Итоговые окна дня — они и попадут в сторис */
  times: number[]
  slots: HourSlot[]
  /** Мастер правил этот день вручную */
  edited: boolean
  /** День прошёл — править нечего */
  past: boolean
}

export interface StoryPage {
  /** «2–8 ноября» */
  range: string
  days: { date: ISODate; times: number[] }[]
}

/** Первое число месяца, в который попадает дата, со сдвигом на shift месяцев */
export function monthStart(iso: ISODate, shift = 0): ISODate {
  const d = fromISO(iso)
  return toISO(new Date(d.getFullYear(), d.getMonth() + shift, 1))
}

export function monthEnd(first: ISODate): ISODate {
  return addDays(monthStart(first, 1), -1)
}

/** Часы рабочего дня: 10:00, 11:00 … последний, который успевает закончиться */
export function hourSlots(workday: Workday): number[] {
  const out: number[] = []
  for (let t = workday.start; t + SLOT <= workday.end; t += SLOT) out.push(t)
  return out
}

export interface WindowsContext {
  appointments: readonly Appointment[]
  workday: Workday
  now: Now
  edits: WindowEdits
}

// Состояние каждого часа дня. Правка мастера не пересиливает записи и время:
// на добавленный час записали клиентку — окна больше нет
function daySlots({ appointments, workday, now, edits }: WindowsContext, date: ISODate): HourSlot[] {
  const day = dayAppointments(appointments, date)
  const edit = edits[date]
  const working = isWorkday(workday, date)
  return hourSlots(workday).map((start): HourSlot => {
    if (date < now.date || (date === now.date && start <= now.minutes)) return { start, state: 'past' }
    if (isBusy(day, start, SLOT)) return { start, state: 'booked' }
    if (working) return { start, state: edit?.rem.includes(start) ? 'removed' : 'auto' }
    return { start, state: edit?.add.includes(start) ? 'added' : 'free' }
  })
}

const isOpen = (s: HourSlot) => s.state === 'auto' || s.state === 'added'

export function monthDay(ctx: WindowsContext, date: ISODate): MonthDay {
  const slots = daySlots(ctx, date)
  return {
    date,
    times: slots.filter(isOpen).map((s) => s.start),
    slots,
    edited: date in ctx.edits,
    past: date < ctx.now.date,
  }
}

/** Все дни месяца с окнами, включая прошедшие — календарь показывает их серыми */
export function monthWindows(ctx: WindowsContext, first: ISODate): MonthDay[] {
  const days: MonthDay[] = []
  for (let d = first, end = monthEnd(first); d <= end; d = addDays(d, 1)) days.push(monthDay(ctx, d))
  return days
}

/**
 * Правка, при которой окнами дня станут ровно эти часы; null — правка не нужна,
 * расчёт и так даёт их. Занятые и прошедшие часы окнами не станут.
 */
export function editFor(day: MonthDay, times: readonly number[]): WindowEdit | null {
  const want = new Set(times)
  const add: number[] = []
  const rem: number[] = []
  for (const s of day.slots) {
    const auto = s.state === 'auto' || s.state === 'removed'
    const manual = s.state === 'added' || s.state === 'free'
    if (auto && !want.has(s.start)) rem.push(s.start)
    if (manual && want.has(s.start)) add.push(s.start)
  }
  return add.length || rem.length ? { add, rem } : null
}

/** Нажатие на час: окно убирается или появляется */
export function toggleHour(day: MonthDay, start: number): WindowEdit | null {
  const times = day.times.includes(start) ? day.times.filter((t) => t !== start) : [...day.times, start]
  return editFor(day, times)
}

/**
 * Серия сторис: оставшиеся дни месяца с окнами по календарным неделям.
 * Недель больше четырёх — самая короткая сливается с соседкой поменьше,
 * чтобы серия не разрасталась из-за хвоста в пару дней.
 */
export function storyPages(days: readonly MonthDay[]): StoryPage[] {
  const groups: MonthDay[][] = []
  for (const d of days) {
    if (d.past || !d.times.length) continue
    const last = groups[groups.length - 1]
    if (last && weekStart(last[0].date) === weekStart(d.date)) last.push(d)
    else groups.push([d])
  }
  while (groups.length > MAX_PAGES) {
    let i = 0
    groups.forEach((g, j) => {
      if (g.length < groups[i].length) i = j
    })
    const left = groups[i - 1]
    const right = groups[i + 1]
    const into = !right || (left && left.length <= right.length) ? i - 1 : i + 1
    const merged = into < i ? [...groups[into], ...groups[i]] : [...groups[i], ...groups[into]]
    groups.splice(Math.min(i, into), 2, merged)
  }
  return groups.map((g) => ({
    range: rangeLabel(g[0].date, g[g.length - 1].date),
    days: g.map((d) => ({ date: d.date, times: d.times })),
  }))
}

/** Дни того же дня недели в этом месяце, которые ещё можно править */
export function sameWeekdays(days: readonly MonthDay[], date: ISODate): MonthDay[] {
  const wd = fromISO(date).getDay()
  return days.filter((d) => !d.past && d.date !== date && fromISO(d.date).getDay() === wd)
}

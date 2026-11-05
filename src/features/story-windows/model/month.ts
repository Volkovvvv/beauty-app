import { dayAppointments, isBusy, isWorkday, type Appointment, type Workday } from '../../../entities/appointment'
import { addDays, fromISO, rangeLabel, toISO, weekStart, type ISODate } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'

// Окно на месяц — свободный час: клиентке в сторис предлагают «11:00», а не промежуток
const SLOT = 60
// Сторис в серии — по неделе на каждую, но не больше четырёх
const MAX_PAGES = 4

/**
 * Ручная правка дня (минуты от полуночи): окна сверх расчёта — целые часы
 * или любое своё время, «9:30», «21:00», — и убранные из расчёта часы
 */
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
  /** Своё время мастера вне сетки часов рабочего дня — всегда added */
  extra?: true
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

// Состояние каждого часа дня и своих окон мастера, по времени. Правка мастера
// не пересиливает записи и время: на добавленный час записали клиентку — окна больше нет
function daySlots({ appointments, workday, now, edits }: WindowsContext, date: ISODate): HourSlot[] {
  const day = dayAppointments(appointments, date)
  const edit = edits[date]
  const working = isWorkday(workday, date)
  const past = (start: number) => date < now.date || (date === now.date && start <= now.minutes)
  const grid = hourSlots(workday)
  const slots = grid.map((start): HourSlot => {
    if (past(start)) return { start, state: 'past' }
    if (isBusy(day, start, SLOT)) return { start, state: 'booked' }
    if (working) return { start, state: edit?.rem.includes(start) ? 'removed' : 'auto' }
    return { start, state: edit?.add.includes(start) ? 'added' : 'free' }
  })
  // Своё время: прошедшее и занятое просто не показываем — править там нечего
  const extras = (edit?.add ?? [])
    .filter((start) => !grid.includes(start) && !past(start) && !isBusy(day, start, SLOT))
    .map((start): HourSlot => ({ start, state: 'added', extra: true }))
  return extras.length ? [...slots, ...extras].sort((a, b) => a.start - b.start) : slots
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
  const known = new Set<number>()
  for (const s of day.slots) {
    known.add(s.start)
    const auto = s.state === 'auto' || s.state === 'removed'
    const manual = s.state === 'added' || s.state === 'free'
    if (auto && !want.has(s.start)) rem.push(s.start)
    if (manual && want.has(s.start)) add.push(s.start)
  }
  // Своё время, которого в этом дне ещё нет, — например, при «так же на все среды»
  for (const t of want) if (!known.has(t)) add.push(t)
  return add.length || rem.length ? { add, rem } : null
}

/** Нажатие на час: окно убирается или появляется */
export function toggleHour(day: MonthDay, start: number): WindowEdit | null {
  const times = day.times.includes(start) ? day.times.filter((t) => t !== start) : [...day.times, start]
  return editFor(day, times)
}

/** Окно в сторис: on — попадёт на картинку, иначе мастер его убрала */
export interface StorySlot {
  start: number
  on: boolean
  /** Добавлено мастером вручную */
  manual: boolean
}

/**
 * Окна дня для сторис с шагом в step часов. Свободное подряд 10–15 при шаге 2 —
 * это 10:00, 12:00 и 14:00: при длинной услуге клиентка всё равно займёт пару часов,
 * а сторис из тридцати окон выглядит как пустое расписание. Убранный час шаг
 * не сдвигает — пропадает только он. Своё время мастера показывается всегда.
 */
export function storySlots(day: MonthDay, step: number): StorySlot[] {
  const out: StorySlot[] = []
  let run = 0
  for (const s of day.slots) {
    if (s.extra) {
      out.push({ start: s.start, on: true, manual: true })
      continue
    }
    if (s.state !== 'auto' && s.state !== 'removed' && s.state !== 'added') {
      run = 0
      continue
    }
    if (run++ % step === 0) out.push({ start: s.start, on: s.state !== 'removed', manual: s.state === 'added' })
  }
  return out
}

/** Окна дня на картинке сторис */
export const storyTimes = (day: MonthDay, step: number): number[] =>
  storySlots(day, step)
    .filter((s) => s.on)
    .map((s) => s.start)

/**
 * Серия сторис: оставшиеся дни месяца с окнами по календарным неделям.
 * Недель больше четырёх — самая короткая сливается с соседкой поменьше,
 * чтобы серия не разрасталась из-за хвоста в пару дней.
 */
export function storyPages(all: readonly MonthDay[], step: number): StoryPage[] {
  const days = all.map((d) => ({ ...d, times: storyTimes(d, step) }))
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

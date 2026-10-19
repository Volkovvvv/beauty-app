// Даты — строки 'YYYY-MM-DD' в местном времени, время — 'HH:MM'
// или минуты от полуночи. Так их удобно сравнивать и класть в ключи.

/** 'YYYY-MM-DD' */
export type ISODate = string
/** 'HH:MM' */
export type Time = string

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const
export const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'] as const
export const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'] as const
export const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'] as const
export const MONTHS_SHORT = ['янв', 'февр', 'март', 'апр', 'мая', 'июня', 'июля', 'авг', 'сент', 'окт', 'нояб', 'дек'] as const

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = (): ISODate => toISO(new Date())

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 0 — понедельник */
export const weekday = (iso: ISODate): number => (fromISO(iso).getDay() + 6) % 7
export const weekStart = (iso: ISODate): ISODate => addDays(iso, -weekday(iso))
export const dayOfMonth = (iso: ISODate): number => fromISO(iso).getDate()
export const monthIndex = (iso: ISODate): number => fromISO(iso).getMonth()

// Math.round гасит час перехода на летнее время
export const daysBetween = (from: ISODate, to: ISODate): number =>
  Math.round((fromISO(to).getTime() - fromISO(from).getTime()) / 864e5)

export function toMinutes(time: Time): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const fromMinutes = (m: number): Time => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`

export function nowMinutes(d = new Date()): number {
  return d.getHours() * 60 + d.getMinutes()
}

/** «22 октября» */
export const dayMonth = (iso: ISODate): string => `${dayOfMonth(iso)} ${MONTHS_GEN[monthIndex(iso)]}`

/** «Чт, 22 октября» */
export const weekdayDayMonth = (iso: ISODate): string => `${WEEKDAYS[weekday(iso)]}, ${dayMonth(iso)}`

/** «19–25 октября» или «27 окт – 2 нояб» */
export function rangeLabel(from: ISODate, to: ISODate): string {
  if (monthIndex(from) === monthIndex(to)) {
    return `${dayOfMonth(from)}–${dayOfMonth(to)} ${MONTHS_GEN[monthIndex(to)]}`
  }
  return `${dayOfMonth(from)} ${MONTHS_SHORT[monthIndex(from)]} – ${dayOfMonth(to)} ${MONTHS_SHORT[monthIndex(to)]}`
}

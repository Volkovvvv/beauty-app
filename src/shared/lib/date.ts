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

// ─── Часовой пояс мастера ─────────────────────────────────────────────
// Записи живут во времени мастера, а не телефона: открыла приложение
// в поездке — «12:00» должно остаться 12:00 у неё в городе.

/** undefined — пояс устройства (пока профиль мастера не загружен) */
let zone: string | undefined

/** Задаёт пояс мастера. Неизвестный Intl пояс игнорируется — остаётся пояс устройства */
export function setTimeZone(tz: string | null | undefined): void {
  if (!tz) return
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    zone = tz
    formatter = null
  } catch {
    // старый браузер не знает пояс — живём в поясе устройства
  }
}

/** Пояс устройства: подсказать мастеру, что она не дома */
export function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
  } catch {
    return undefined
  }
}

let formatter: Intl.DateTimeFormat | null = null

/** Дата и минуты момента в поясе мастера */
export function zoned(d: Date): { date: ISODate; minutes: number } {
  formatter ??= new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const p: Record<string, string> = {}
  for (const part of formatter.formatToParts(d)) p[part.type] = part.value
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) }
}

/** Момент, когда в поясе мастера наступают date и minutes */
export function fromZoned(date: ISODate, minutes: number): Date {
  const [y, m, d] = date.split('-').map(Number)
  const wall = Date.UTC(y, m - 1, d, 0, minutes)
  // Смещение пояса: настенное время минус UTC. Второй проход — на случай перевода часов
  const offset = (t: number) => {
    const z = zoned(new Date(t))
    const [zy, zm, zd] = z.date.split('-').map(Number)
    return Date.UTC(zy, zm - 1, zd, 0, z.minutes) - Math.floor(t / 60_000) * 60_000
  }
  const first = wall - offset(wall)
  return new Date(wall - offset(first))
}

export const todayISO = (): ISODate => zoned(new Date()).date

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
  return zoned(d).minutes
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

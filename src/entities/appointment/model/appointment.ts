import { toMinutes, type ISODate, type Time } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'
import { servicesTitle, type Service } from '../../service'

/** planned — ждём, arrived — клиентка в кресле, done — готово, cancelled — отменена */
export type AppointmentStatus = 'planned' | 'arrived' | 'done' | 'cancelled'

export interface Appointment {
  id: string
  clientId: string
  date: ISODate
  start: Time
  minutes: number
  /** Снимок услуг на момент записи: прайс потом может поменяться */
  services: Service[]
  /** Уточнение к услугам: «кошачий глаз», «миндаль» */
  note?: string
  /** Рубли */
  price: number
  status: AppointmentStatus
  /** Сколько клиентка заплатила, рубли */
  paid: number
  /** Ответила на напоминание «Приду» */
  confirmed: boolean
  /** Ответила «Не смогу» — мастеру пора переносить */
  declined: boolean
  /** Напоминание о визите уже ушло */
  reminded: boolean
  /** Переключатели из формы: напоминать о визите, позвать на коррекцию */
  remind: boolean
  rebook: boolean
}

/** Что задаёт мастер при записи; остальное посчитает сервер */
export interface AppointmentDraft {
  clientId: string
  date: ISODate
  start: Time
  services: Service[]
  note?: string
  remind: boolean
  rebook: boolean
}

/** Рабочий день мастера, минуты от полуночи: по нему режутся слоты и сетка недели */
export interface Workday {
  start: number
  end: number
}

export const DEFAULT_WORKDAY: Workday = { start: 10 * 60, end: 21 * 60 }

export type TimelineItem =
  | { kind: 'appointment'; start: number; appointment: Appointment }
  | { kind: 'window'; start: number; minutes: number }

export type FreeWindow = Extract<TimelineItem, { kind: 'window' }>

// Окно короче часа никому не предложишь
const MIN_WINDOW = 60

export const startOf = (a: Appointment): number => toMinutes(a.start)
export const endOf = (a: Appointment): number => toMinutes(a.start) + a.minutes

export const isActive = (a: Appointment): boolean => a.status !== 'cancelled'

export const byStart = (a: Appointment, b: Appointment): number =>
  a.date === b.date ? startOf(a) - startOf(b) : a.date < b.date ? -1 : 1

/** Записи дня без отменённых, по времени */
export function dayAppointments(appointments: readonly Appointment[], date: ISODate): Appointment[] {
  return appointments.filter((a) => a.date === date && isActive(a)).sort(byStart)
}

/** Прошла ли запись к моменту now */
export function isPast(a: Appointment, now: Now): boolean {
  if (a.status === 'done') return true
  if (a.date !== now.date) return a.date < now.date
  return a.status !== 'arrived' && endOf(a) <= now.minutes
}

// Свободные промежутки между записями дня — их можно предложить листу ожидания.
// Только между записями: утро до первой и вечер после последней мастер держит сам.
export function freeWindows(day: readonly Appointment[]): FreeWindow[] {
  const windows: FreeWindow[] = []
  for (let i = 1; i < day.length; i += 1) {
    const from = endOf(day[i - 1])
    const to = startOf(day[i])
    if (to - from >= MIN_WINDOW) windows.push({ kind: 'window', start: from, minutes: to - from })
  }
  return windows
}

/** Лента дня: записи и окна вперемешку, по времени */
export function dayTimeline(day: readonly Appointment[]): TimelineItem[] {
  return [
    ...day.map((appointment): TimelineItem => ({ kind: 'appointment', start: startOf(appointment), appointment })),
    ...freeWindows(day),
  ].sort((a, b) => a.start - b.start)
}

/** Пересекается ли [start, start + minutes) с какой-нибудь записью дня */
export function isBusy(day: readonly Appointment[], start: number, minutes: number, ignoreId?: string): boolean {
  const end = start + minutes
  return day.some((a) => a.id !== ignoreId && start < endOf(a) && startOf(a) < end)
}

export const daySum = (day: readonly Appointment[]): number => day.reduce((sum, a) => sum + a.price, 0)

/** Долг: проведённая запись, оплаченная не полностью */
export const debtOf = (a: Appointment): number => (a.status === 'done' ? Math.max(0, a.price - a.paid) : 0)

/** «Коррекция + дизайн · «кошачий глаз»» */
export function appointmentTitle(a: Appointment): string {
  const services = servicesTitle(a.services)
  return a.note ? `${services} · ${a.note}` : services
}

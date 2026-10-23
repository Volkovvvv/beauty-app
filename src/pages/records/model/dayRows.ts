import { dayAppointments, daySum, endOf, isWorkday, startOf, type Appointment } from '../../../entities/appointment'
import { monthDay, type WindowsContext } from '../../../features/story-windows'
import type { ISODate } from '../../../shared/lib/date'

const HOUR = 60

export type DayRow =
  | { kind: 'appointment'; start: number; end: number; appointment: Appointment }
  // Свободное время подряд: десять, одиннадцать и двенадцать часов — одно окно с десяти до тринадцати
  | { kind: 'window'; start: number; end: number }

export interface DayView {
  rows: DayRow[]
  /** Сколько записей */
  records: number
  sum: number
  /** Выходной по графику, на который мастер не добавил окон и записей нет */
  dayOff: boolean
}

/** Подряд идущие часы одним окном */
function mergeHours(times: readonly number[]): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = []
  for (const t of times) {
    const last = out[out.length - 1]
    if (last && last.end === t) last.end = t + HOUR
    else out.push({ start: t, end: t + HOUR })
  }
  return out
}

/** Лента дня: записи и свободные окна вперемешку по времени. Окна — как в календаре месяца */
export function dayView(ctx: WindowsContext, date: ISODate): DayView {
  const list = dayAppointments(ctx.appointments, date)
  const windows = mergeHours(monthDay(ctx, date).times)
  const rows: DayRow[] = [
    ...list.map((appointment): DayRow => ({ kind: 'appointment', start: startOf(appointment), end: endOf(appointment), appointment })),
    ...windows.map((w): DayRow => ({ kind: 'window', ...w })),
  ].sort((a, b) => a.start - b.start)
  return {
    rows,
    records: list.length,
    sum: daySum(list),
    dayOff: !list.length && !windows.length && !isWorkday(ctx.workday, date),
  }
}

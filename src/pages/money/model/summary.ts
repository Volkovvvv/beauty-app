import { mainService, servicesCost } from '../../../entities/service'
import { debtOf, isActive, type Appointment } from '../../../entities/appointment'
import type { Client } from '../../../entities/client'
import { addDays, dayMonth, dayOfMonth, fromISO, MONTHS, rangeLabel, toISO, weekday, WEEKDAYS, weekStart, type ISODate } from '../../../shared/lib/date'
import { plural } from '../../../shared/lib/format'

export type Period = 'week' | 'month'

export interface MoneySummary {
  caption: string
  total: number
  delta: { value: number; label: string } | null
  bars: { label: string; value: number; highlight: boolean }[]
  avgCheck: number
  materials: number
  services: { name: string; value: number }[]
  /** Дни периода, в которые были записи, — от последнего к первому */
  days: DayIncome[]
  /** В период попадает сегодня */
  current: boolean
}

export interface DayIncome {
  date: ISODate
  total: number
  /** «3 записи» */
  count: string
  /** День ещё впереди: деньги только запланированы */
  upcoming: boolean
}

export interface Debt {
  id: string
  client: Client | undefined
  amount: number
  note: string
}

interface Range {
  from: ISODate
  to: ISODate
}

// «к сентябрю» — сравнение с прошлым месяцем
const MONTHS_DAT = ['январю', 'февралю', 'марту', 'апрелю', 'маю', 'июню', 'июлю', 'августу', 'сентябрю', 'октябрю', 'ноябрю', 'декабрю']

function monthBounds(iso: ISODate, shift = 0): Range & { month: number } {
  const d = fromISO(iso)
  const first = new Date(d.getFullYear(), d.getMonth() + shift, 1)
  return {
    from: toISO(first),
    to: toISO(new Date(d.getFullYear(), d.getMonth() + shift + 1, 0)),
    month: first.getMonth(),
  }
}

const inRange = (list: readonly Appointment[], { from, to }: Range) =>
  list.filter((a) => isActive(a) && a.date >= from && a.date <= to)

const sum = (list: readonly Appointment[]) => list.reduce((total, a) => total + a.price, 0)

/** Тот же день, но в соседнем периоде: листание недель и месяцев */
export function shiftPeriod(period: Period, anchor: ISODate, step: number): ISODate {
  return period === 'week' ? addDays(anchor, step * 7) : monthBounds(anchor, step).from
}

function periodFrame(period: Period, anchor: ISODate, today: ISODate) {
  if (period === 'week') {
    const from = weekStart(anchor)
    return {
      range: { from, to: addDays(from, 6) },
      prev: { from: addDays(from, -7), to: addDays(from, -1) },
      bars: WEEKDAYS.map((label, i) => ({ label: String(label), from: addDays(from, i), to: addDays(from, i) })),
      highlight: weekStart(today) === from ? weekday(today) : -1,
      caption: rangeLabel(from, addDays(from, 6)),
      deltaTo: 'к прошлой неделе',
    }
  }
  const cur = monthBounds(anchor)
  const last = monthBounds(anchor, -1)
  const thisYear = fromISO(today).getFullYear()
  const year = fromISO(cur.from).getFullYear()
  const days = dayOfMonth(cur.to)
  const bars: (Range & { label: string })[] = []
  for (let start = 1, n = 1; start <= days; start += 7, n += 1) {
    bars.push({ label: `${n} нед`, from: addDays(cur.from, start - 1), to: addDays(cur.from, Math.min(start + 6, days) - 1) })
  }
  return {
    range: cur,
    prev: last,
    bars,
    highlight: today >= cur.from && today <= cur.to ? Math.floor((dayOfMonth(today) - 1) / 7) : -1,
    caption: year === thisYear ? MONTHS[cur.month] : `${MONTHS[cur.month]} ${year}`,
    deltaTo: `к ${MONTHS_DAT[last.month]}`,
  }
}

// Сводка за неделю или месяц, в который попадает anchor.
// Считаются все неотменённые записи периода, в том числе ещё предстоящие
export function moneySummary(appointments: readonly Appointment[], period: Period, anchor: ISODate, today: ISODate): MoneySummary {
  const frame = periodFrame(period, anchor, today)
  const list = inRange(appointments, frame.range)
  const total = sum(list)
  const before = sum(inRange(appointments, frame.prev))
  const delta = before ? Math.round(((total - before) / before) * 100) : null

  // Выручка и материалы за один проход; выручка — по главной услуге записи
  const byService = new Map<string, number>()
  const byDay = new Map<ISODate, { total: number; count: number }>()
  let materials = 0
  for (const a of list) {
    const day = byDay.get(a.date) ?? { total: 0, count: 0 }
    byDay.set(a.date, { total: day.total + a.price, count: day.count + 1 })
    const name = mainService(a.services)?.name ?? 'Другое'
    byService.set(name, (byService.get(name) ?? 0) + a.price)
    materials += servicesCost(a.services)
  }

  // Три крупных услуги и «остальное» одной строкой
  const sorted = [...byService].sort((a, b) => b[1] - a[1])
  const services = sorted.slice(0, 3).map(([name, value]) => ({ name, value }))
  const rest = sorted.slice(3)
  if (rest.length) {
    services.push({
      name: rest.map(([name], i) => (i ? name.toLowerCase() : name)).join(', '),
      value: rest.reduce((s, [, v]) => s + v, 0),
    })
  }

  return {
    caption: frame.caption,
    total,
    delta: delta === null ? null : { value: delta, label: `${delta >= 0 ? '+' : '−'}${Math.abs(delta)}% ${frame.deltaTo}` },
    bars: frame.bars.map((b, i) => ({ label: b.label, value: sum(inRange(list, b)), highlight: i === frame.highlight })),
    avgCheck: list.length ? total / list.length : 0,
    materials,
    services,
    days: [...byDay]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([date, d]) => ({
        date,
        total: d.total,
        count: `${d.count} ${plural(d.count, ['запись', 'записи', 'записей'])}`,
        upcoming: date > today,
      })),
    current: today >= frame.range.from && today <= frame.range.to,
  }
}

/** Кто не доплатил: по одной строке на запись с остатком */
export function debts(appointments: readonly Appointment[], clientById: Map<string, Client>): Debt[] {
  return appointments.flatMap((a) => {
    const amount = debtOf(a)
    if (!amount) return []
    return [
      {
        id: a.id,
        client: clientById.get(a.clientId),
        amount,
        note: `Остаток за ${(mainService(a.services)?.name ?? 'запись').toLowerCase()}, ${dayMonth(a.date)}`,
      },
    ]
  })
}

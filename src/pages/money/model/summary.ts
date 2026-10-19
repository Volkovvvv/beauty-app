import { mainService, servicesCost } from '../../../entities/service'
import { debtOf, isActive, type Appointment } from '../../../entities/appointment'
import type { Client } from '../../../entities/client'
import { addDays, dayMonth, dayOfMonth, fromISO, MONTHS, rangeLabel, toISO, weekday, WEEKDAYS, weekStart, type ISODate } from '../../../shared/lib/date'

export type Period = 'week' | 'month'

export interface MoneySummary {
  caption: string
  total: number
  delta: { value: number; label: string } | null
  bars: { label: string; value: number; highlight: boolean }[]
  avgCheck: number
  materials: number
  services: { name: string; value: number }[]
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

function periodFrame(period: Period, today: ISODate) {
  if (period === 'week') {
    const from = weekStart(today)
    return {
      range: { from, to: addDays(from, 6) },
      prev: { from: addDays(from, -7), to: addDays(from, -1) },
      bars: WEEKDAYS.map((label, i) => ({ label: String(label), from: addDays(from, i), to: addDays(from, i) })),
      highlight: weekday(today),
      caption: rangeLabel(from, addDays(from, 6)),
      deltaTo: 'к прошлой неделе',
    }
  }
  const cur = monthBounds(today)
  const last = monthBounds(today, -1)
  const days = dayOfMonth(cur.to)
  const bars: (Range & { label: string })[] = []
  for (let start = 1, n = 1; start <= days; start += 7, n += 1) {
    bars.push({ label: `${n} нед`, from: addDays(cur.from, start - 1), to: addDays(cur.from, Math.min(start + 6, days) - 1) })
  }
  return {
    range: cur,
    prev: last,
    bars,
    highlight: Math.floor((dayOfMonth(today) - 1) / 7),
    caption: MONTHS[cur.month],
    deltaTo: `к ${MONTHS_DAT[last.month]}`,
  }
}

// Сводка за неделю или месяц, в который попадает today.
// Считаются все неотменённые записи периода, в том числе ещё предстоящие
export function moneySummary(appointments: readonly Appointment[], period: Period, today: ISODate): MoneySummary {
  const frame = periodFrame(period, today)
  const list = inRange(appointments, frame.range)
  const total = sum(list)
  const before = sum(inRange(appointments, frame.prev))
  const delta = before ? Math.round(((total - before) / before) * 100) : null

  // Выручка и материалы за один проход; выручка — по главной услуге записи
  const byService = new Map<string, number>()
  let materials = 0
  for (const a of list) {
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

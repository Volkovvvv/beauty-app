import { addDays, dayMonth, daysBetween, toMinutes, type ISODate } from '../../../shared/lib/date'
import { count, plural } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import type { Appointment } from '../../appointment'

export interface ClientCard {
  shape?: string
  likes?: string
  allergy?: string
  payment?: string
}

export interface WorkPhoto {
  id: string
  label: string
  /** Фото, выбранное только что: показываем его, пока оно уходит на сервер */
  localUrl?: string
}

/** none — не приглашена в бота, invited — ссылка отправлена, accepted — подключена */
export type InviteStatus = 'none' | 'invited' | 'accepted'

export interface Client {
  id: string
  name: string
  /** Username в Telegram — есть, только если клиентка подключилась к боту */
  username: string | null
  inviteStatus: InviteStatus
  /** Раз в сколько недель ходит на коррекцию */
  repeatWeeks: number
  card: ClientCard
  photos: WorkPhoto[]
}

export interface ClientStats {
  visits: number
  total: number
  /** Первая запись */
  since: ISODate | null
  lastVisit: ISODate | null
  daysSince: number | null
  next: Appointment | null
  /** Давно не была и ни на что не записана — пора звать на коррекцию */
  due: boolean
  suggestedDate: ISODate | null
  lastServiceIds: string[]
}

const EMPTY: readonly Appointment[] = []

export const firstName = (client: Client | undefined): string => client?.name.split(' ')[0] ?? ''

/** «Алина Морозова» → «АМ»; letters: 1 — только первая буква */
export function initials(name: string, letters = 2): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, letters)
    .map((p) => p[0].toUpperCase())
    .join('')
}

/** Короткое имя для тесных мест: «Алина М.» */
export function shortName(name: string): string {
  const [first, last] = name.split(' ')
  return last ? `${first} ${last[0]}.` : first
}

export const indexById = (clients: readonly Client[]): Map<string, Client> =>
  new Map(clients.map((c) => [c.id, c]))

/** Записи по клиенткам — чтобы считать историю каждой, не перебирая все записи заново */
export function groupByClient(appointments: readonly Appointment[]): Map<string, Appointment[]> {
  const map = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const list = map.get(a.clientId)
    if (list) list.push(a)
    else map.set(a.clientId, [a])
  }
  return map
}

/** Записи клиентки из группировки; пустой массив — общий, чтобы не плодить новые */
export const appointmentsOf = (groups: Map<string, Appointment[]>, clientId: string): readonly Appointment[] =>
  groups.get(clientId) ?? EMPTY

/** История клиентки за один проход: визиты, сумма, последняя и ближайшая запись */
export function clientStats(client: Client, mine: readonly Appointment[], now: Now): ClientStats {
  let visits = 0
  let total = 0
  let since: ISODate | null = null
  let last: Appointment | null = null
  let next: Appointment | null = null

  for (const a of mine) {
    if (a.status === 'cancelled') continue
    if (!since || a.date < since) since = a.date
    // Закончившаяся сегодня запись уже не «ближайшая», а визит
    const ended = a.date === now.date && a.status === 'planned' && toMinutes(a.start) + a.minutes <= now.minutes
    if (a.status === 'done' || a.date < now.date || ended) {
      visits += 1
      total += a.price
      if (!last || a.date > last.date) last = a
    } else if (!next || a.date < next.date || (a.date === next.date && a.start < next.start)) {
      next = a
    }
  }

  const daysSince = last ? daysBetween(last.date, now.date) : null
  return {
    visits,
    total,
    since,
    lastVisit: last?.date ?? null,
    daysSince,
    next,
    due: !next && daysSince !== null && daysSince >= client.repeatWeeks * 7,
    suggestedDate: last ? addDays(last.date, client.repeatWeeks * 7) : null,
    lastServiceIds: last?.services.map((s) => s.id) ?? [],
  }
}

/**
 * «Была 19 дней назад · пора на коррекцию», «Записана на 12 ноября».
 * correction — направление мастера про коррекцию; иначе «пора записаться»
 */
export function clientHint(stats: ClientStats, today: ISODate, correction = true): string {
  if (stats.next) {
    return stats.next.date === today ? `Сегодня в ${stats.next.start}` : `Записана на ${dayMonth(stats.next.date)}`
  }
  if (stats.daysSince === null) return 'Новая клиентка'
  const when =
    stats.daysSince === 0
      ? 'Была сегодня'
      : stats.daysSince === 1
        ? 'Была вчера'
        : `Была ${count(stats.daysSince, ['день', 'дня', 'дней'])} назад`
  return stats.due ? `${when} · ${correction ? 'пора на коррекцию' : 'пора записаться'}` : when
}

export const visitsLabel = (n: number): string => `${n} ${plural(n, ['визит', 'визита', 'визитов'])}`

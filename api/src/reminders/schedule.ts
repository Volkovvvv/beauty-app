import { ReminderKind } from '@prisma/client'

/** Во сколько должно уйти конкретное напоминание. */
export interface PlannedReminder {
  kind: ReminderKind
  scheduledAt: Date
}

/** Интервалы напоминаний о визите из профиля мастера. 0 — выключено. */
export interface NotifyWindow {
  beforeHours: number
  beforeMinutes: number
}

/** Тихие часы в таймзоне мастера: ночью бот клиенткам не пишет. */
export const QUIET_FROM = 22 * 60
export const QUIET_TO = 9 * 60

const DAY_MINUTES = 1440
/** Напоминание, сдвинутое на конец тишины, должно прийти хотя бы за столько до визита. */
const MIN_LEAD_MS = 30 * 60_000

function minutesOfDay(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: timezone,
  }).formatToParts(date)
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0)
  return part('hour') * 60 + part('minute')
}

/** Сколько минут прошло с начала тишины; null — сейчас не тихие часы. */
function intoQuiet(at: Date, timezone: string): number | null {
  const since = (minutesOfDay(at, timezone) - QUIET_FROM + DAY_MINUTES) % DAY_MINUTES
  const length = (QUIET_TO - QUIET_FROM + DAY_MINUTES) % DAY_MINUTES
  return since < length ? since : null
}

const QUIET_LENGTH = (QUIET_TO - QUIET_FROM + DAY_MINUTES) % DAY_MINUTES

/**
 * Выносит напоминание о визите из тихих часов. Сначала пробуем позже —
 * на конец тишины; если так до визита меньше получаса, шлём раньше —
 * за минуту до начала тишины: «за 2 часа» про визит в 10:00 придёт вечером накануне.
 */
export function outOfQuiet(at: Date, startsAt: Date, timezone: string): Date {
  const since = intoQuiet(at, timezone)
  if (since === null) return at
  const later = new Date(at.getTime() + (QUIET_LENGTH - since) * 60_000)
  if (startsAt.getTime() - later.getTime() >= MIN_LEAD_MS) return later
  return new Date(at.getTime() - (since + 1) * 60_000)
}

/**
 * Когда напомнить о визите. Чистая функция без Date.now() внутри:
 * время передаётся аргументом, поведение проверяется тестами.
 */
export function planVisitReminders(startsAt: Date, notify: NotifyWindow, now: Date, timezone: string): PlannedReminder[] {
  const planned: PlannedReminder[] = []

  const add = (kind: ReminderKind, offsetMs: number): void => {
    if (offsetMs <= 0) return
    const scheduledAt = outOfQuiet(new Date(startsAt.getTime() - offsetMs), startsAt, timezone)
    // Момент уже прошёл: запись «на завтра» с напоминанием за неделю
    // иначе сразу отправила бы просроченное уведомление.
    if (scheduledAt <= now) return
    // Тишина могла свести оба напоминания в одну минуту — двух подряд не шлём
    if (planned.some((p) => p.scheduledAt.getTime() === scheduledAt.getTime())) return
    planned.push({ kind, scheduledAt })
  }

  add(ReminderKind.BEFORE_HOURS, notify.beforeHours * 3_600_000)
  add(ReminderKind.BEFORE_MINUTES, notify.beforeMinutes * 60_000)
  return planned
}

/**
 * Когда позвать на коррекцию: через repeatWeeks после визита, в то же время дня,
 * а если оно в тихих часах — утром. null — момент уже прошёл.
 */
export function planRebook(startsAt: Date, repeatWeeks: number, now: Date, timezone: string): Date | null {
  const at = new Date(startsAt.getTime() + repeatWeeks * 7 * 86_400_000)
  const since = intoQuiet(at, timezone)
  const scheduledAt = since === null ? at : new Date(at.getTime() + (QUIET_LENGTH - since) * 60_000)
  return scheduledAt > now ? scheduledAt : null
}

/**
 * Тексты бота клиенткам. Время — в таймзоне мастера: «12:00» в сообщении
 * должно совпадать с тем, что мастер видит в приложении. Рядом — пояс.
 */

function formatTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: timezone }).format(date)
}

function formatDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: timezone }).format(date)
}

const ZONE_NAMES: Record<string, string> = {
  'Europe/Moscow': 'мск',
  'Europe/Minsk': 'по Минску',
}

/** Чьё это время: «мск» или «UTC+5». Пояс клиентки бот узнать не может. */
export function zoneLabel(date: Date, timezone: string): string {
  if (ZONE_NAMES[timezone]) return ZONE_NAMES[timezone]
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')?.value
  return (offset ?? 'GMT').replace('GMT', 'UTC').replace(/[+-]0$/, '')
}

/** Календарный день в таймзоне числом суток от эпохи — чтобы сравнивать дни. */
function dayNumber(date: Date, timezone: string): number {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date).split('-').map(Number)
  return Date.UTC(y, m - 1, d) / 86_400_000
}

/** «сегодня в 12:00 мск», «завтра в …» или «24 октября в …» — от момента отправки */
export function whenLabel(startsAt: Date, timezone: string, now: Date): string {
  const days = dayNumber(startsAt, timezone) - dayNumber(now, timezone)
  const day = days === 0 ? 'сегодня' : days === 1 ? 'завтра' : formatDate(startsAt, timezone)
  return `${day} в ${formatTime(startsAt, timezone)} ${zoneLabel(startsAt, timezone)}`
}

/**
 * Напоминание о визите. Имя мастера — именительным падежом отдельной фразой:
 * склонять произвольные имена бот не умеет, а «к Вике» без склонения режет глаз.
 */
export function visitReminderText(opts: {
  clientName: string
  masterName: string
  services: string
  startsAt: Date
  timezone: string
  now: Date
}): string {
  return (
    `${opts.clientName}, напоминаю о записи ${whenLabel(opts.startsAt, opts.timezone, opts.now)}: ${opts.services.toLowerCase()}.\n` +
    `Мастер — ${opts.masterName}. Получится прийти?`
  )
}

/**
 * «Пора на коррекцию» — после визита, если клиентка не записалась снова.
 * correction: false — для стрижки или массажа «коррекция» звучит странно, пишем «записаться снова».
 */
export function rebookText(opts: { clientName: string; weeks: number; masterUsername: string | null; correction: boolean }): string {
  const n = opts.weeks
  // 1 неделя, 3 недели, 5 недель, 21 неделя
  const form = n % 10 === 1 && n % 100 !== 11 ? 'неделя' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'недели' : 'недель'
  const weeks = `${n} ${form}`
  const contact = opts.masterUsername ? `Напишите мастеру: @${opts.masterUsername}` : 'Напишите мастеру, чтобы выбрать время.'
  return `${opts.clientName}, с прошлого визита ${form === 'неделя' ? 'прошла' : 'прошло'} ${weeks} — ${opts.correction ? 'пора на коррекцию' : 'самое время записаться снова'}.\n${contact}`
}

/** Мастеру — что клиентка ответила «не смогу». */
export function declinedText(clientName: string, startsAt: Date, timezone: string, now: Date): string {
  return (
    `${clientName} не сможет прийти ${whenLabel(startsAt, timezone, now)}.\n` +
    'Запись осталась в расписании — перенесите или отмените её в приложении.'
  )
}

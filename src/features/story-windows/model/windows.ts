import { addDays, dayOfMonth, rangeLabel, weekday, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import { count } from '../../../shared/lib/format'
import { monthDay, type WindowsContext } from './month'

/** Неделя — одна сторис из шторки, месяц — серия по неделям (экран окон месяца) */
export type StoryPeriod = 'week' | 'month'

export interface StoryDay {
  date: ISODate
  /** «Чт 22» */
  label: string
  /** Начала свободных окон, минуты от полуночи */
  times: number[]
}

export interface StoryWindows {
  /** «22–28 октября», «22 окт – 20 нояб» */
  range: string
  days: StoryDay[]
}

const WEEK = 7

/** Ключ окна для отметок «убрать из сторис» */
export const windowKey = (date: ISODate, start: number): string => `${date}@${start}`

export const windowsLabel = (n: number): string => count(n, ['окно', 'окна', 'окон'])

/**
 * Свободные окна на неделю вперёд, начиная с сегодня. Те же, что в календаре
 * месяца и ленте «Записей»: свободные часы рабочего дня с ручными правками
 * мастера; выходной по графику попадает сюда, только если мастер добавил окно.
 */
export function storyWindows(ctx: WindowsContext): StoryWindows {
  const dates = Array.from({ length: WEEK }, (_, i) => addDays(ctx.now.date, i))
  const days = dates
    .map((date) => ({
      date,
      label: `${WEEKDAYS[weekday(date)]} ${dayOfMonth(date)}`,
      times: monthDay(ctx, date).times,
    }))
    .filter((d) => d.times.length)
  return { range: rangeLabel(dates[0], dates[dates.length - 1]), days }
}

/** Только окна, которые мастер не убрал */
export function visibleDays(days: readonly StoryDay[], off: ReadonlySet<string>): StoryDay[] {
  return days
    .map((d) => ({ ...d, times: d.times.filter((t) => !off.has(windowKey(d.date, t))) }))
    .filter((d) => d.times.length)
}

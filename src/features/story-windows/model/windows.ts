import { addDays, dayOfMonth, rangeLabel, weekday, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import { count } from '../../../shared/lib/format'
import { monthDay, storySlots, type MonthDay, type StorySlot, type WindowsContext } from './month'

/** Неделя — одна сторис из шторки, месяц — серия по неделям (экран окон месяца) */
export type StoryPeriod = 'week' | 'month'

export interface StoryDay {
  date: ISODate
  /** «Чт 22» */
  label: string
  /** Начала свободных окон, минуты от полуночи */
  times: number[]
}

/** День недели в редакторе шторки: все окна с шагом, включая убранные */
export interface WeekDay {
  date: ISODate
  /** «Чт 22» */
  label: string
  day: MonthDay
  slots: StorySlot[]
}

export interface StoryWindows {
  /** «22–28 октября», «22 окт – 20 нояб» */
  range: string
  /** Дни с окнами — то, что попадёт на картинку */
  days: StoryDay[]
  /** Все семь дней — для правки окон */
  week: WeekDay[]
}

const WEEK = 7

export const windowsLabel = (n: number): string => count(n, ['окно', 'окна', 'окон'])

/**
 * Свободные окна на неделю вперёд, начиная с сегодня. Те же, что в календаре
 * месяца и ленте «Записей»: свободные часы рабочего дня с ручными правками
 * мастера, но с шагом step часов — см. storySlots.
 */
export function storyWindows(ctx: WindowsContext, step: number): StoryWindows {
  const dates = Array.from({ length: WEEK }, (_, i) => addDays(ctx.now.date, i))
  const week = dates.map((date): WeekDay => {
    const day = monthDay(ctx, date)
    return { date, label: `${WEEKDAYS[weekday(date)]} ${dayOfMonth(date)}`, day, slots: storySlots(day, step) }
  })
  const days = week
    .map((d) => ({ date: d.date, label: d.label, times: d.slots.filter((s) => s.on).map((s) => s.start) }))
    .filter((d) => d.times.length)
  return { range: rangeLabel(dates[0], dates[dates.length - 1]), days, week }
}

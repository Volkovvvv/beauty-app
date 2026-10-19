import { ReminderKind } from '@prisma/client'
import { outOfQuiet, planRebook, planVisitReminders } from './schedule'

const TZ = 'Europe/Moscow'
const msk = (s: string) => new Date(`${s}+03:00`)

describe('planVisitReminders', () => {
  const now = msk('2026-10-20T10:00:00')

  it('за день и за 2 часа до визита', () => {
    const plan = planVisitReminders(msk('2026-10-22T12:00:00'), { beforeHours: 24, beforeMinutes: 120 }, now, TZ)
    expect(plan).toEqual([
      { kind: ReminderKind.BEFORE_HOURS, scheduledAt: msk('2026-10-21T12:00:00') },
      { kind: ReminderKind.BEFORE_MINUTES, scheduledAt: msk('2026-10-22T10:00:00') },
    ])
  })

  it('не планирует напоминания, время которых прошло', () => {
    const plan = planVisitReminders(msk('2026-10-20T19:00:00'), { beforeHours: 24, beforeMinutes: 120 }, now, TZ)
    expect(plan.map((p) => p.kind)).toEqual([ReminderKind.BEFORE_MINUTES])
  })

  it('выключенный интервал — без напоминания', () => {
    expect(planVisitReminders(msk('2026-10-22T12:00:00'), { beforeHours: 0, beforeMinutes: 0 }, now, TZ)).toEqual([])
  })

  it('ночью не пишет: «за 2 часа» про визит в 10:00 уходит в 9:00', () => {
    const startsAt = msk('2026-10-22T10:00:00')
    expect(outOfQuiet(msk('2026-10-22T08:00:00'), startsAt, TZ)).toEqual(msk('2026-10-22T09:00:00'))
  })

  it('после тишины до визита меньше получаса — шлёт вечером накануне', () => {
    const startsAt = msk('2026-10-22T09:20:00')
    expect(outOfQuiet(msk('2026-10-22T07:20:00'), startsAt, TZ)).toEqual(msk('2026-10-21T21:59:00'))
  })

  it('«за день» про визит в 23:00 переносится на утро того же дня', () => {
    const startsAt = msk('2026-10-22T23:00:00')
    expect(outOfQuiet(msk('2026-10-21T23:00:00'), startsAt, TZ)).toEqual(msk('2026-10-22T09:00:00'))
  })
})

describe('planRebook', () => {
  it('через repeatWeeks в то же время дня', () => {
    const at = planRebook(msk('2026-10-22T12:00:00'), 3, msk('2026-10-22T15:00:00'), TZ)
    expect(at).toEqual(msk('2026-11-12T12:00:00'))
  })

  it('поздний визит — зовём утром, а не ночью', () => {
    const at = planRebook(msk('2026-10-22T22:30:00'), 3, msk('2026-10-22T23:00:00'), TZ)
    expect(at).toEqual(msk('2026-11-13T09:00:00'))
  })

  it('давний визит — не зовём задним числом', () => {
    expect(planRebook(msk('2026-01-10T12:00:00'), 3, msk('2026-10-22T12:00:00'), TZ)).toBeNull()
  })
})

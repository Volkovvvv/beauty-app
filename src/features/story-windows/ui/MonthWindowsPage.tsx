import { useEffect, useMemo, useState } from 'react'
import type { Appointment, Workday } from '../../../entities/appointment'
import { cx } from '../../../shared/lib/cx'
import { dayOfMonth, fromMinutes, MONTHS, MONTHS_GEN, monthIndex, weekday, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import { count } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { IconButton } from '../../../shared/ui'
import {
  editFor,
  monthEnd,
  monthWindows,
  sameWeekdays,
  storyPages,
  toggleHour,
  type MonthDay,
  type WindowEdit,
  type WindowEdits,
} from '../model/month'
import { loadPrefs } from '../model/prefs'
import { windowsLabel } from '../model/windows'
import MonthStoryCard from './MonthStoryCard'
import s from './MonthWindowsPage.module.css'

const WEEKDAYS_LOWER = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']
const ALL_WEEKDAYS = ['все понедельники', 'все вторники', 'все среды', 'все четверги', 'все пятницы', 'все субботы', 'все воскресенья']

const daysLabel = (n: number) => count(n, ['день', 'дня', 'дней'])

/** «Пн–Сб», «Пн, Ср, Пт», «Пн–Ср, Пт» */
function workDaysLabel(days: readonly number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  const parts: string[] = []
  for (let i = 0; i < sorted.length; ) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1
    parts.push(j - i >= 2 ? `${WEEKDAYS[sorted[i]]}–${WEEKDAYS[sorted[j]]}` : sorted.slice(i, j + 1).map((d) => WEEKDAYS[d]).join(', '))
    i = j + 1
  }
  return parts.join(', ')
}

interface MonthWindowsPageProps {
  appointments: readonly Appointment[]
  workday: Workday
  now: Now
  edits: WindowEdits
  /** Первое число показанного месяца */
  month: ISODate
  /** Можно ли листать назад и вперёд */
  canPrev: boolean
  canNext: boolean
  onMonth: (step: number) => void
  onLoadEdits: (from: ISODate, to: ISODate) => void
  onSaveEdits: (changes: Record<ISODate, WindowEdit | null>) => void
  /** «Вика · ногти» — подпись на превью */
  name: string
  onCreate: () => void
  onBack: () => void
}

// Окошки на месяц (5a): окна собираются сами из рабочих часов без записей,
// мастер правит то, что не так, и собирает из них серию сторис
export default function MonthWindowsPage({
  appointments,
  workday,
  now,
  edits,
  month,
  canPrev,
  canNext,
  onMonth,
  onLoadEdits,
  onSaveEdits,
  name,
  onCreate,
  onBack,
}: MonthWindowsPageProps) {
  const [prefs] = useState(loadPrefs)
  const ctx = useMemo(() => ({ appointments, workday, now, edits }), [appointments, workday, now, edits])
  const days = useMemo(() => monthWindows(ctx, month), [ctx, month])
  const pages = useMemo(() => storyPages(days), [days])
  const [selected, setSelected] = useState<ISODate | null>(null)

  useEffect(() => {
    onLoadEdits(month, monthEnd(month))
  }, [month, onLoadEdits])

  // Другой месяц — выбран первый день, который ещё можно править
  const day = days.find((d) => d.date === selected && !d.past) ?? days.find((d) => !d.past) ?? days[0]
  const upcoming = days.filter((d) => !d.past)
  const withWindows = upcoming.filter((d) => d.times.length)
  const total = withWindows.reduce((n, d) => n + d.times.length, 0)
  const edited = upcoming.filter((d) => d.edited)
  const monthName = MONTHS[monthIndex(month)].toLowerCase()

  const save = (list: readonly MonthDay[], edit: (d: MonthDay) => WindowEdit | null) =>
    onSaveEdits(Object.fromEntries(list.map((d) => [d.date, edit(d)])))

  const leading = weekday(month)
  const dayCount = day.past
    ? 'день прошёл'
    : day.times.length
      ? windowsLabel(day.times.length)
      : workday.days.includes(weekday(day.date))
        ? 'нет окон'
        : 'выходной по графику'

  return (
    <div className={s.screen}>
      <div className={s.top}>
        <IconButton label="Назад" variant="white" onClick={onBack}>‹</IconButton>
        <div className={s.titleBox}>
          <span className={s.title}>Окошки на {monthName}</span>
          <span className={s.sub}>Собраны из расписания</span>
        </div>
      </div>

      <div className={s.summary}>
        <div className={s.summaryText}>
          <span className={s.summaryTitle}>
            {workday.days.length ? workDaysLabel(workday.days) : 'Без рабочих дней'}, {fromMinutes(workday.start)}–{fromMinutes(workday.end)}, без записей
          </span>
          <span className={s.summarySub}>{edited.length ? `Изменено вручную: ${daysLabel(edited.length)}` : 'Без ручных правок'}</span>
        </div>
        {edited.length ? (
          <button type="button" className={s.resetAll} onClick={() => save(edited, () => null)}>
            Сбросить все
          </button>
        ) : null}
      </div>

      <div className={s.calendar}>
        <div className={s.monthRow}>
          <span className={s.monthName}>{MONTHS[monthIndex(month)]}</span>
          <div className={s.arrows}>
            {canPrev ? <IconButton label="Прошлый месяц" variant="white" onClick={() => onMonth(-1)}>‹</IconButton> : null}
            {canNext ? <IconButton label="Следующий месяц" variant="white" onClick={() => onMonth(1)}>›</IconButton> : null}
          </div>
        </div>
        <div className={s.week}>
          {WEEKDAYS.map((w) => (
            <span key={w} className={s.weekday}>{w}</span>
          ))}
        </div>
        <div className={s.week}>
          {Array.from({ length: leading }, (_, i) => (
            <span key={`pad${i}`} />
          ))}
          {days.map((d) => {
            const on = d.date === day.date
            return (
              <button
                key={d.date}
                type="button"
                disabled={d.past}
                aria-pressed={on}
                aria-label={`${dayOfMonth(d.date)} ${MONTHS_GEN[monthIndex(d.date)]}, ${windowsLabel(d.times.length)}`}
                className={cx(s.cell, d.times.length > 0 && s.cellOpen, on && s.cellOn, d.past && s.cellPast)}
                onClick={() => setSelected(d.date)}
              >
                <span className={s.cellNum}>{dayOfMonth(d.date)}</span>
                <span className={s.cellCount}>
                  {d.times.length ? `${d.times.length} ок` : ''}
                  {d.edited && !d.past ? <span className={s.editDot} /> : null}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={s.dayHead}>
        <span className={s.dayTitle}>
          {dayOfMonth(day.date)} {MONTHS_GEN[monthIndex(day.date)]}, {WEEKDAYS_LOWER[weekday(day.date)]}
        </span>
        <span className={s.dayCount}>{dayCount}</span>
      </div>

      <div className={s.hours}>
        {day.slots.map((slot) => {
          const locked = slot.state === 'booked' || slot.state === 'past'
          return (
            <button
              key={slot.start}
              type="button"
              disabled={locked}
              aria-pressed={slot.state === 'auto' || slot.state === 'added'}
              className={cx(s.hour, s[slot.state])}
              onClick={() => save([day], (d) => toggleHour(d, slot.start))}
            >
              {fromMinutes(slot.start)}
              {slot.state === 'added' ? <span className={s.hourMark} /> : null}
            </button>
          )
        })}
      </div>

      <div className={s.legend}>
        <span className={s.legendItem}><span className={cx(s.swatch, s.auto)} />Свободно по расписанию</span>
        <span className={s.legendItem}><span className={cx(s.swatch, s.added)} />Добавлено вручную</span>
        <span className={s.legendItem}><span className={cx(s.swatch, s.removed)} />Убрано вручную</span>
        <span className={s.legendItem}><span className={cx(s.swatch, s.booked)} />Занято</span>
      </div>

      {day.past ? null : (
        <div className={s.actions}>
          <button
            type="button"
            className={s.copy}
            onClick={() => save(sameWeekdays(days, day.date), (d) => editFor(d, day.times))}
          >
            Так же на {ALL_WEEKDAYS[weekday(day.date)]}
          </button>
          <button type="button" className={s.soft} onClick={() => save([day], (d) => editFor(d, []))}>
            Выходной
          </button>
          {day.edited ? (
            <button type="button" className={s.softInk} onClick={() => save([day], () => null)}>
              Вернуть как было
            </button>
          ) : null}
        </div>
      )}

      <div className={s.bar}>
        <button type="button" className={s.thumb} aria-label="Предпросмотр сторис" disabled={!pages.length} onClick={onCreate}>
          {pages.length ? (
            <span className={s.thumbScale}>
              <MonthStoryCard
                template={prefs.template ?? 'cherry'}
                page={pages[0]}
                pageLabel={`1 / ${pages.length}`}
                name={name}
                handle={prefs.handle ?? ''}
                photo={prefs.photo ?? null}
              />
            </span>
          ) : null}
        </button>
        <span className={s.barText}>
          <span className={s.barTitle}>{windowsLabel(total)}</span>
          <span className={s.barSub}>
            {daysLabel(withWindows.length)} · {monthName}
          </span>
        </span>
        <button type="button" className={s.create} disabled={!pages.length} onClick={onCreate}>
          {pages.length ? `Создать ${count(pages.length, ['сторис', 'сторис', 'сторис'])}` : 'Окон нет'}
        </button>
      </div>
    </div>
  )
}

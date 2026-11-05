import { useEffect, useMemo, useRef, useState } from 'react'
import { dayAppointments, isBusy, type Appointment, type Workday } from '../../../entities/appointment'
import { cx } from '../../../shared/lib/cx'
import { fromMinutes, toMinutes, type ISODate, type Time } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'
import { Segmented } from '../../../shared/ui'
import { storyFontCSS } from '../model/fonts'
import { blurredBackground } from '../model/image'
import { editFor, type WindowEdit, type WindowEdits } from '../model/month'
import { loadPrefs, savePrefs, STEPS, TEMPLATES, type StoryStep, type StoryTemplate } from '../model/prefs'
import { publishStory, type ShareResult } from '../model/share'
import { storyWindows, windowsLabel, type StoryPeriod, type WeekDay } from '../model/windows'
import StoryCard from './StoryCard'
import s from './StorySheet.module.css'

const PERIODS: readonly { value: StoryPeriod; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]

const STEP_OPTIONS = STEPS.map((n) => ({ value: String(n), label: n === 1 ? 'Каждый час' : `Через ${n} ч` }))

interface StorySheetProps {
  appointments: readonly Appointment[]
  workday: Workday
  now: Now
  /** Ручные правки окон — те же, что в календаре месяца: правки отсюда сохраняются туда же */
  edits: WindowEdits
  onLoadEdits: (from: ISODate, to: ISODate) => void
  onSaveEdits: (changes: Readonly<Record<ISODate, WindowEdit | null>>) => void
  /** Шаг окон в сторис, часы — общий с серией на месяц */
  step: StoryStep
  onStep: (step: StoryStep) => void
  /** «Вика · ногти» */
  name: string
  /** Ник из Telegram без @ — подпись по умолчанию */
  username: string | null
  onClose: () => void
  /** left — сколько сторис недели ещё не выложено */
  onShared: (result: ShareResult, left: number) => void
  onError: (message: string) => void
  /** «Месяц» — окна на месяц с правкой и серия сторис по неделям */
  onOpenMonth: () => void
}

// С какого дня начинается каждая сторис недели. Ключ — всё, от чего зависит
// вёрстка: сменился он — разбивка и отметки «выложено» начинаются заново
interface Split {
  key: string
  starts: number[]
  done: ReadonlySet<number>
}

// «Окошки в сторис»: свободные окна недели картинкой для сторис.
// Шторка поверх «Записей» — вариант 4a макета. Месяц — отдельным экраном (5a).
// Не влезли в одну картинку — дни переезжают в следующие сторис серии
export default function StorySheet({
  appointments,
  workday,
  now,
  edits,
  onLoadEdits,
  onSaveEdits,
  step,
  onStep,
  name,
  username,
  onClose,
  onShared,
  onError,
  onOpenMonth,
}: StorySheetProps) {
  const [prefs] = useState(loadPrefs)
  const [template, setTemplate] = useState<StoryTemplate>(prefs.template ?? 'photo')
  const [photo, setPhoto] = useState<string | null>(prefs.photo ?? null)
  const [handle, setHandle] = useState(prefs.handle ?? (username ? `@${username}` : ''))
  // День, в который мастер вписывает своё время
  const [adding, setAdding] = useState<ISODate | null>(null)
  const [newTime, setNewTime] = useState<Time>('12:00')
  const [busy, setBusy] = useState(false)
  const [index, setIndex] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)

  const windows = useMemo(() => storyWindows({ appointments, workday, now, edits }, step), [appointments, workday, now, edits, step])
  const shown = windows.days
  const shownCount = shown.reduce((n, d) => n + d.times.length, 0)

  const splitKey = `${template}|${handle.trim()}|${shown.map((d) => d.date + d.times.join()).join('|')}`
  const [split, setSplit] = useState<Split>({ key: splitKey, starts: [0], done: new Set() })
  const { starts, done } = split.key === splitKey ? split : { starts: [0], done: new Set<number>() }
  const pages = starts.map((from, i) => shown.slice(from, starts[i + 1] ?? shown.length))
  const current = Math.min(index, pages.length - 1)
  const label = (i: number) => `${i + 1} / ${pages.length}`
  const pageOf = new Map(pages.flatMap((days, i) => days.map((d) => [d.date, i] as const)))

  // Сторис i вместила n дней: следующая начинается после них
  const measured = (i: number, n: number) =>
    setSplit((prev) => {
      const base = prev.key === splitKey ? prev : { key: splitKey, starts: [0], done: new Set<number>() }
      const from = base.starts[i]
      if (from === undefined) return prev
      const next = from + n
      if (base.starts[i + 1] === next || (next >= shown.length && base.starts.length === i + 1)) return base
      const starts = base.starts.slice(0, i + 1)
      if (next < shown.length) starts.push(next)
      return { ...base, starts }
    })

  useEffect(() => savePrefs({ template, photo, handle }), [template, photo, handle])

  // Правки окон недели — те же, что в календаре месяца
  const weekFrom = windows.week[0].date
  const weekTo = windows.week[windows.week.length - 1].date
  useEffect(() => onLoadEdits(weekFrom, weekTo), [weekFrom, weekTo, onLoadEdits])

  // Шрифты для картинки — заранее, пока мастер выбирает шаблон
  useEffect(() => {
    void storyFontCSS()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saveDay = (w: WeekDay, times: readonly number[]) => onSaveEdits({ [w.date]: editFor(w.day, times) })

  // Окно убирается и возвращается насовсем — так же, как в календаре месяца
  const toggle = (w: WeekDay, start: number) =>
    saveDay(w, w.day.times.includes(start) ? w.day.times.filter((t) => t !== start) : [...w.day.times, start])

  // Нажатие на день: убрать все его окна из сторис или вернуть их
  const toggleDay = (w: WeekDay) => {
    const on = w.slots.filter((x) => x.on).map((x) => x.start)
    if (on.length) saveDay(w, w.day.times.filter((t) => !on.includes(t)))
    else saveDay(w, [...w.day.times, ...w.slots.map((x) => x.start)])
  }

  const addTime = (w: WeekDay) => {
    if (!/^\d{2}:\d{2}$/.test(newTime)) return
    const start = toMinutes(newTime)
    if (w.date === now.date && start <= now.minutes) return onError('Это время уже прошло')
    if (isBusy(dayAppointments(appointments, w.date), start, 60)) return onError('На это время уже есть запись')
    setAdding(null)
    if (!w.day.times.includes(start)) saveDay(w, [...w.day.times, start])
  }


  const pickTemplate = (id: StoryTemplate) => {
    setTemplate(id)
    if (id === 'photo' && !photo) file.current?.click()
  }

  const onFile = async (f: File | undefined) => {
    if (!f) return
    try {
      setPhoto(await blurredBackground(f))
      setTemplate('photo')
    } catch (e) {
      onError((e as Error).message)
    }
  }

  const share = async () => {
    if (!card.current || busy) return
    setBusy(true)
    try {
      const result = await publishStory(card.current)
      const nextDone = new Set(done).add(current)
      setSplit({ key: splitKey, starts, done: nextDone })
      const next = pages.findIndex((_, i) => !nextDone.has(i))
      if (next >= 0) setIndex(next)
      onShared(result, pages.length - nextDone.size)
    } catch (e) {
      onError((e as Error).message || 'Не удалось собрать сторис — попробуйте ещё раз')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className={s.backdrop} onClick={onClose} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Окошки в сторис">
        <div className={s.scroll}>
          <span className={s.grip} />

          <div className={s.head}>
            <div className={s.headText}>
              <span className={s.title}>Окошки в сторис</span>
              <span className={s.sub}>
                {windows.range} · {windowsLabel(shownCount)}
              </span>
            </div>
            <button type="button" className={s.close} aria-label="Закрыть" onClick={onClose}>
              ×
            </button>
          </div>

          <Segmented
            label="Период"
            options={PERIODS}
            value="week"
            onChange={(p: StoryPeriod) => {
              if (p === 'month') onOpenMonth()
            }}
          />

          <div className={s.editor}>
            <div className={s.preview}>
              <div className={s.previewScale}>
                <StoryCard
                  ref={card}
                  template={template}
                  days={pages[current]}
                  range={windows.range}
                  name={name}
                  handle={handle.trim()}
                  photo={photo}
                />
              </div>
            </div>

            {/* Невидимые копии всех сторис серии: по ним считается, сколько дней влезает в каждую */}
            <div className={s.measure} aria-hidden="true">
              {pages.map((days, i) => (
                <StoryCard
                  key={starts[i]}
                  template={template}
                  days={days}
                  range={windows.range}
                  name={name}
                  handle={handle.trim()}
                  photo={photo}
                  onShown={(n) => measured(i, n)}
                />
              ))}
            </div>

            <div className={s.side}>
              <span className={s.label}>Шаблон</span>
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={t.id === template}
                  className={cx(s.template, t.id === template && s.templateOn)}
                  onClick={() => pickTemplate(t.id)}
                >
                  <span
                    className={s.swatch}
                    style={{ background: t.id === 'photo' && photo ? `url(${photo}) center/cover` : t.swatch }}
                  />
                  {t.name}
                </button>
              ))}
              <button type="button" className={s.photoBtn} onClick={() => file.current?.click()}>
                {photo ? 'Сменить фото' : '+ Загрузить фото'}
              </button>
              <input
                ref={file}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void onFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          {pages.length > 1 ? (
            <div className={s.series}>
              <span className={s.seriesText}>
                В одну сторис все окна не влезли — получилось {pages.length}, выкладывайте по очереди
              </span>
              <div className={s.pages}>
                {pages.map((_, i) => (
                  <button
                    key={starts[i]}
                    type="button"
                    aria-pressed={i === current}
                    aria-label={`Сторис ${label(i)}${done.has(i) ? ', выложена' : ''}`}
                    className={cx(s.page, i === current && s.pageOn)}
                    onClick={() => setIndex(i)}
                  >
                    {label(i)}
                    {done.has(i) ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className={s.handleRow}>
            <span className={s.label}>Подпись внизу</span>
            <input
              className={s.handleInput}
              value={handle}
              maxLength={40}
              placeholder="@ник или телефон"
              onChange={(e) => setHandle(e.target.value)}
            />
          </label>

          <div className={s.stepRow}>
            <span className={s.label}>Окна в сторис</span>
            <Segmented
              label="Шаг окон в сторис"
              options={STEP_OPTIONS}
              value={String(step)}
              onChange={(v) => onStep(Number(v) as StoryStep)}
            />
          </div>

          <div className={s.listHead}>
            <span className={s.listTitle}>Какие окна показать</span>
            <span className={s.listHint}>нажми, чтобы убрать · + своё время</span>
          </div>

          <div className={s.days}>
            {windows.week.map((w) => {
              const page = pageOf.get(w.date)
              return (
                <div key={w.date} className={s.dayBlock}>
                  <div className={s.day}>
                    <button
                      type="button"
                      className={s.dayLabel}
                      disabled={!w.slots.length}
                      aria-label={`${w.label}: ${w.slots.some((x) => x.on) ? 'убрать все окна' : 'вернуть все окна'}`}
                      onClick={() => toggleDay(w)}
                    >
                      {w.label}
                      {pages.length > 1 && page !== undefined ? <span className={s.dayPage}>сторис {page + 1}</span> : null}
                    </button>
                    <div className={s.chips}>
                      {w.slots.map((x) => (
                        <button
                          key={x.start}
                          type="button"
                          aria-pressed={x.on}
                          className={cx(s.chip, !x.on && s.chipOff, x.manual && x.on && s.chipManual)}
                          onClick={() => toggle(w, x.start)}
                        >
                          {fromMinutes(x.start)}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-label={`Добавить своё время, ${w.label}`}
                        aria-expanded={adding === w.date}
                        className={s.chipAdd}
                        onClick={() => setAdding(adding === w.date ? null : w.date)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {adding === w.date ? (
                    <div className={s.addRow}>
                      <input
                        type="time"
                        className={s.timeInput}
                        value={newTime}
                        step={300}
                        aria-label="Время окна"
                        onChange={(e) => setNewTime(e.target.value as Time)}
                      />
                      <button type="button" className={s.addOk} onClick={() => addTime(w)}>
                        Добавить
                      </button>
                      <button type="button" className={s.addCancel} onClick={() => setAdding(null)}>
                        Отмена
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {!shownCount ? <span className={s.empty}>Окон в сторис нет — добавьте своё время плюсом у дня</span> : null}
        </div>

        <button type="button" className={s.share} disabled={busy || !shownCount} onClick={share}>
          {busy
            ? 'Собираю картинку…'
            : pages.length === 1
              ? 'Поделиться в сторис'
              : done.has(current)
                ? `Выложить ${label(current)} ещё раз`
                : `Выложить ${label(current)}`}
        </button>
      </div>
    </>
  )
}

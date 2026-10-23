import { useEffect, useMemo, useRef, useState } from 'react'
import type { Appointment, Workday } from '../../../entities/appointment'
import { cx } from '../../../shared/lib/cx'
import { fromMinutes } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'
import { Segmented } from '../../../shared/ui'
import { storyFontCSS } from '../model/fonts'
import { blurredBackground } from '../model/image'
import type { WindowEdits } from '../model/month'
import { loadPrefs, savePrefs, TEMPLATES, type StoryTemplate } from '../model/prefs'
import { publishStory, type ShareResult } from '../model/share'
import { storyWindows, visibleDays, windowKey, windowsLabel, type StoryPeriod } from '../model/windows'
import StoryCard from './StoryCard'
import s from './StorySheet.module.css'

const PERIODS: readonly { value: StoryPeriod; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]

interface StorySheetProps {
  appointments: readonly Appointment[]
  workday: Workday
  now: Now
  /** Ручные правки окон — те же, что в календаре месяца */
  edits: WindowEdits
  /** «Вика · ногти» */
  name: string
  /** Ник из Telegram без @ — подпись по умолчанию */
  username: string | null
  onClose: () => void
  onShared: (result: ShareResult) => void
  onError: (message: string) => void
  /** «Месяц» — окна на месяц с правкой и серия сторис по неделям */
  onOpenMonth: () => void
}

// «Окошки в сторис»: свободные окна недели картинкой для сторис.
// Шторка поверх «Записей» — вариант 4a макета. Месяц — отдельным экраном (5a)
export default function StorySheet({ appointments, workday, now, edits, name, username, onClose, onShared, onError, onOpenMonth }: StorySheetProps) {
  const [prefs] = useState(loadPrefs)
  const [template, setTemplate] = useState<StoryTemplate>(prefs.template ?? 'photo')
  const [photo, setPhoto] = useState<string | null>(prefs.photo ?? null)
  const [handle, setHandle] = useState(prefs.handle ?? (username ? `@${username}` : ''))
  // Убранные окна: убранное пропадает и с картинки, и из счётчика
  const [off, setOff] = useState<ReadonlySet<string>>(() => new Set())
  const [busy, setBusy] = useState(false)
  // Сколько окон не влезло в кадр — их нет на картинке
  const [hidden, setHidden] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)

  const windows = useMemo(() => storyWindows({ appointments, workday, now, edits }), [appointments, workday, now, edits])
  const shown = useMemo(() => visibleDays(windows.days, off), [windows.days, off])
  const shownCount = shown.reduce((n, d) => n + d.times.length, 0)

  useEffect(() => savePrefs({ template, photo, handle }), [template, photo, handle])

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

  const toggle = (key: string) =>
    setOff((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

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
      onShared(await publishStory(card.current))
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
                  days={shown}
                  range={windows.range}
                  name={name}
                  handle={handle.trim()}
                  photo={photo}
                  onHidden={setHidden}
                />
              </div>
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

          {hidden ? (
            <span className={s.warn}>
              Не поместилось {windowsLabel(hidden)} — уберите лишние ниже
            </span>
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

          <div className={s.listHead}>
            <span className={s.listTitle}>Какие окна показать</span>
            <span className={s.listHint}>нажми, чтобы убрать</span>
          </div>

          {windows.days.length ? (
            <div className={s.days}>
              {windows.days.map((d) => (
                <div key={d.date} className={s.day}>
                  <span className={s.dayLabel}>{d.label}</span>
                  <div className={s.chips}>
                    {d.times.map((t) => {
                      const key = windowKey(d.date, t)
                      const isOff = off.has(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={!isOff}
                          className={cx(s.chip, isOff && s.chipOff)}
                          onClick={() => toggle(key)}
                        >
                          {fromMinutes(t)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <span className={s.empty}>Свободных окон нет — всё расписано</span>
          )}
        </div>

        <button type="button" className={s.share} disabled={busy || !shownCount} onClick={share}>
          {busy ? 'Собираю картинку…' : 'Поделиться в сторис'}
        </button>
      </div>
    </>
  )
}

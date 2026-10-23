import { useEffect, useMemo, useRef, useState } from 'react'
import type { Appointment, Workday } from '../../../entities/appointment'
import { cx } from '../../../shared/lib/cx'
import { MONTHS, monthIndex, type ISODate } from '../../../shared/lib/date'
import type { Now } from '../../../shared/lib/useNow'
import { IconButton } from '../../../shared/ui'
import { storyFontCSS } from '../model/fonts'
import { blurredBackground } from '../model/image'
import { monthWindows, storyPages, type WindowEdits } from '../model/month'
import { loadPrefs, savePrefs, TEMPLATES, type StoryTemplate } from '../model/prefs'
import { publishStory, type ShareResult } from '../model/share'
import { windowsLabel } from '../model/windows'
import MonthStoryCard from './MonthStoryCard'
import s from './MonthStoriesPage.module.css'

interface MonthStoriesPageProps {
  appointments: readonly Appointment[]
  workday: Workday
  now: Now
  edits: WindowEdits
  /** Первое число месяца */
  month: ISODate
  /** «Вика · ногти» */
  name: string
  /** Ник из Telegram без @ — подпись по умолчанию */
  username: string | null
  onShared: (result: ShareResult, left: number) => void
  onError: (message: string) => void
  onBack: () => void
}

// Серия сторис на месяц (6a): по неделе на сторис, данные — из окон месяца
// вместе с правками. Telegram публикует сторис по одной — выкладываем по очереди
export default function MonthStoriesPage({ appointments, workday, now, edits, month, name, username, onShared, onError, onBack }: MonthStoriesPageProps) {
  const [prefs] = useState(loadPrefs)
  const [template, setTemplate] = useState<StoryTemplate>(prefs.template ?? 'cherry')
  const [photo, setPhoto] = useState<string | null>(prefs.photo ?? null)
  const [handle, setHandle] = useState(prefs.handle ?? (username ? `@${username}` : ''))
  const [index, setIndex] = useState(0)
  // Какие сторис серии уже выложены — следующая выбирается сама
  const [done, setDone] = useState<ReadonlySet<number>>(() => new Set())
  const [busy, setBusy] = useState(false)
  const [hidden, setHidden] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const file = useRef<HTMLInputElement>(null)

  const pages = useMemo(
    () => storyPages(monthWindows({ appointments, workday, now, edits }, month)),
    [appointments, workday, now, edits, month]
  )
  const current = Math.min(index, Math.max(0, pages.length - 1))
  const page = pages[current]
  const label = (i: number) => `${i + 1} / ${pages.length}`

  useEffect(() => savePrefs({ template, photo, handle }), [template, photo, handle])

  useEffect(() => {
    void storyFontCSS()
  }, [])

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
      setDone(nextDone)
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
    <div className={s.screen}>
      <div className={s.top}>
        <IconButton label="Назад" variant="white" onClick={onBack}>‹</IconButton>
        <div className={s.titleBox}>
          <span className={s.title}>Серия сторис</span>
          <span className={s.sub}>{MONTHS[monthIndex(month)]} · по неделе на сторис</span>
        </div>
      </div>

      <div className={s.templates}>
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
          {photo ? 'Сменить фото' : '+ Фото'}
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

      {page ? (
        <>
          <div className={s.preview}>
            <div className={s.previewScale}>
              <MonthStoryCard
                ref={card}
                template={template}
                page={page}
                pageLabel={label(current)}
                name={name}
                handle={handle.trim()}
                photo={photo}
                onHidden={setHidden}
              />
            </div>
          </div>

          {hidden ? (
            <span className={s.warn}>Не поместилось {windowsLabel(hidden)} — уберите лишние окна в календаре</span>
          ) : null}

          <div className={s.pages}>
            {pages.map((p, i) => (
              <button
                key={p.range}
                type="button"
                aria-pressed={i === current}
                aria-label={`Сторис ${label(i)}, ${p.range}`}
                className={cx(s.page, i === current && s.pageOn)}
                onClick={() => setIndex(i)}
              >
                <span className={s.pageScale}>
                  <MonthStoryCard template={template} page={p} pageLabel={label(i)} name={name} handle={handle.trim()} photo={photo} />
                </span>
                {done.has(i) ? <span className={s.pageDone} aria-hidden="true">✓</span> : null}
              </button>
            ))}
          </div>

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
        </>
      ) : (
        <span className={s.empty}>Свободных окон в этом месяце не осталось</span>
      )}

      {page ? (
        <button type="button" className={s.share} disabled={busy} onClick={share}>
          {busy ? 'Собираю картинку…' : done.has(current) ? `Выложить ${label(current)} ещё раз` : `Выложить ${label(current)}`}
        </button>
      ) : null}
    </div>
  )
}

import { useState } from 'react'
import type { Specialty } from '../../../entities/master'
import { cx } from '../../../shared/lib/cx'
import { count, duration, rub } from '../../../shared/lib/format'
import { newId } from '../../../shared/lib/id'
import { INSTAGRAM_ERROR, instagramHandle } from '../../../shared/lib/instagram'
import { IconButton, PriceInput, Stepper } from '../../../shared/ui'
import s from './Onboarding.module.css'

/** Что уходит на сервер одним запросом */
export interface OnboardingResult {
  displayName: string
  address: string
  instagram: string
  specialties: string[]
  services: { name: string; minutes: number; price: number; category: string }[]
}

interface OnboardingPageProps {
  catalog: readonly Specialty[]
  telegramName: string
  /** Сохраняет знакомство; ошибку покажет экран */
  onSubmit: (result: OnboardingResult) => Promise<void>
  /** «Открыть приложение» с финального экрана */
  onFinish: () => void
}

interface Row {
  key: string
  name: string
  minutes: number
  price: number
  category: string
}

type Step = 0 | 1 | 2 | 3 | 4

const STEP_LABELS = ['', 'Шаг 1 из 3 · о вас', 'Шаг 2 из 3 · сфера', 'Шаг 3 из 3 · услуги и цены']
const INTRO = ['О вас и где принимаете', 'Ваша сфера', 'Свои услуги и цены']

const MIN_MINUTES = 10
const MAX_MINUTES = 600

const servicesLabel = (n: number) => count(n, ['услуга', 'услуги', 'услуг'])
const row = (category: string, name = '', minutes = 60): Row => ({ key: newId('r'), name, minutes, price: 0, category })
const complete = (r: Row) => r.name.trim().length > 0 && r.price > 0

// Знакомство (8a): о себе → сфера → свои услуги и цены. Услуги отсюда
// попадают в «Мои услуги» и в онлайн-запись клиенток
export default function OnboardingPage({ catalog, telegramName, onSubmit, onFinish }: OnboardingPageProps) {
  const [step, setStep] = useState<Step>(0)
  const [name, setName] = useState(telegramName.split(' ')[0] ?? '')
  const [address, setAddress] = useState('')
  const [instagram, setInstagram] = useState('')
  // Порядок выбора сохраняется: первая сфера — основная
  const [picked, setPicked] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = instagramHandle(instagram)
  const ready = rows.filter(complete)
  // Название вписано, а цены нет — такую услугу не сохраним, говорим об этом
  const noPrice = rows.filter((r) => r.name.trim() && !r.price).length
  const canNext = [true, name.trim().length > 0 && handle !== null, picked.length > 0, ready.length > 0][step] ?? false

  const update = (key: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]))

  // К услугам: строки убранных сфер уходят, у новой сферы — пустая строка для начала
  const toServices = () =>
    setRows((list) => {
      const kept = list.filter((r) => picked.includes(r.category))
      for (const id of picked) if (!kept.some((r) => r.category === id)) kept.push(row(id))
      return kept.sort((a, b) => picked.indexOf(a.category) - picked.indexOf(b.category))
    })

  // Подсказка заполняет пустую строку раздела, а если её нет — добавляет новую
  const suggest = (category: string, title: string, minutes: number) =>
    setRows((list) => {
      const empty = list.find((r) => r.category === category && !r.name.trim())
      if (empty) return list.map((r) => (r === empty ? { ...r, name: title, minutes } : r))
      const last = list.map((r) => r.category).lastIndexOf(category)
      const next = [...list]
      next.splice(last + 1, 0, row(category, title, minutes))
      return next
    })

  const addRow = (category: string) =>
    setRows((list) => {
      const last = list.map((r) => r.category).lastIndexOf(category)
      const next = [...list]
      next.splice(last + 1, 0, row(category))
      return next
    })

  const submit = () => {
    setSaving(true)
    setError('')
    onSubmit({
      displayName: name.trim(),
      address: address.trim(),
      instagram: handle ?? '',
      specialties: picked,
      services: ready.map((r) => ({ name: r.name.trim(), minutes: r.minutes, price: r.price, category: r.category })),
    })
      .then(() => setStep(4))
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false))
  }

  const next = () => {
    if (!canNext || saving) return
    if (step === 2) toServices()
    if (step === 3) submit()
    else setStep((step + 1) as Step)
  }

  if (step === 4) {
    const from = Math.min(...ready.map((r) => r.price))
    return (
      <div className={s.done}>
        <span className={s.doneMark}>✓</span>
        <span className={s.doneTitle}>Всё готово, {name.trim() || 'мастер'}</span>
        <span className={s.doneSum}>
          {servicesLabel(ready.length)} · от {rub(from)}
        </span>
        <span className={s.doneText}>
          Услуги уже видны клиентам в онлайн-записи. Поменять цены или добавить новые можно в Профиле → Мои услуги.
        </span>
        <span className={s.spacer} />
        <button type="button" className={s.doneBtn} onClick={onFinish}>
          Открыть приложение
        </button>
      </div>
    )
  }

  const nextLabel =
    step === 0
      ? 'Начать'
      : step === 3
        ? saving
          ? 'Сохраняем…'
          : ready.length
            ? `Готово · ${servicesLabel(ready.length)}`
            : 'Добавьте хотя бы одну услугу'
        : 'Дальше'

  return (
    <div className={s.screen}>
      {step > 0 ? (
        <div className={s.progress}>
          <IconButton label="Назад" onClick={() => setStep((step - 1) as Step)}>‹</IconButton>
          <div className={s.progressText}>
            <span className={s.stepLabel}>{STEP_LABELS[step]}</span>
            <div className={s.segments}>
              {[1, 2, 3].map((n) => (
                <span key={n} className={cx(s.segment, n <= step && s.segmentOn)} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {step === 0 ? (
        <div className={s.intro}>
          <span className={s.kicker}>Добро пожаловать</span>
          <span className={s.hero}>Давайте познакомимся</span>
          <span className={s.lead}>
            Расскажите, чем вы занимаетесь, и внесите услуги с ценами. Из них соберётся онлайн-запись для клиентов. Всё можно
            поменять потом.
          </span>
          <div className={s.introList}>
            {INTRO.map((t, i) => (
              <div key={t} className={s.introRow}>
                <span className={s.introNum}>{i + 1}</span>
                <span className={s.introText}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <>
          <span className={s.stepTitle}>Расскажите о себе</span>
          <div className={s.fields}>
            <label className={s.field}>
              <span className={s.fieldLabel}>Как вас зовут</span>
              <input className={s.input} value={name} maxLength={100} placeholder="Имя" onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={s.field}>
              <span className={s.fieldLabel}>Где принимаете</span>
              <input
                className={s.input}
                value={address}
                maxLength={200}
                placeholder="Улица, дом, студия"
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.fieldLabel}>Instagram</span>
              <input
                className={cx(s.input, handle === null && s.inputError)}
                value={instagram}
                maxLength={100}
                placeholder="@username"
                autoCapitalize="none"
                autoCorrect="off"
                onChange={(e) => setInstagram(e.target.value)}
              />
              {handle === null ? <span className={s.error}>{INSTAGRAM_ERROR}</span> : null}
            </label>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <div className={s.stepHead}>
            <span className={s.stepTitle}>Чем вы занимаетесь?</span>
            <span className={s.stepSub}>Выберите сферу, можно несколько. Услуги и цены впишете сами на следующем шаге.</span>
          </div>
          <div className={s.cats}>
            {catalog.map((c) => {
              const on = picked.includes(c.id)
              return (
                <button key={c.id} type="button" aria-pressed={on} className={cx(s.cat, on && s.catOn)} onClick={() => toggle(c.id)}>
                  <span className={s.catMark}>{on ? '✓' : ''}</span>
                  <span className={s.catName}>{c.label}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <div className={s.stepHead}>
            <span className={s.stepTitle}>Услуги и цены</span>
            <span className={s.stepSub}>Впишите название, длительность и цену. Подсказки под разделом добавляют название в один тап.</span>
          </div>
          {picked.map((id) => {
            const spec = catalog.find((c) => c.id === id)
            const items = rows.filter((r) => r.category === id)
            const taken = new Set(items.map((r) => r.name.trim().toLowerCase()))
            const hints = (spec?.suggestions ?? []).filter((x) => !taken.has(x.name.toLowerCase()))
            return (
              <div key={id} className={s.group}>
                <span className={s.groupName}>{spec?.label ?? id}</span>
                {items.map((r) => (
                  <div key={r.key} className={s.svc}>
                    <div className={s.svcTop}>
                      <input
                        className={s.svcName}
                        value={r.name}
                        maxLength={60}
                        placeholder="Название услуги"
                        aria-label="Название услуги"
                        onChange={(e) => update(r.key, { name: e.target.value })}
                      />
                      <button
                        type="button"
                        className={s.svcDel}
                        aria-label="Удалить"
                        onClick={() => setRows((list) => list.filter((x) => x.key !== r.key))}
                      >
                        ×
                      </button>
                    </div>
                    <div className={s.svcBottom}>
                      <Stepper
                        label="Длительность"
                        value={r.minutes}
                        onChange={(minutes) => update(r.key, { minutes })}
                        step={10}
                        min={MIN_MINUTES}
                        max={MAX_MINUTES}
                        format={duration}
                      />
                      <PriceInput label="Цена" value={r.price} onChange={(price) => update(r.key, { price })} />
                    </div>
                  </div>
                ))}
                {hints.length ? (
                  <div className={s.hints}>
                    {hints.map((x) => (
                      <button key={x.name} type="button" className={s.hint} onClick={() => suggest(id, x.name, x.minutes)}>
                        + {x.name}
                      </button>
                    ))}
                  </div>
                ) : null}
                <button type="button" className={s.more} onClick={() => addRow(id)}>
                  + Ещё услуга
                </button>
              </div>
            )
          })}
          {noPrice ? (
            <span className={s.warn}>Без цены не сохранится: {servicesLabel(noPrice)}</span>
          ) : null}
          {error ? <span className={s.error}>{error}</span> : null}
        </>
      ) : null}

      <div className={s.cta}>
        <button type="button" className={s.next} disabled={!canNext || saving} onClick={next}>
          {nextLabel}
        </button>
      </div>
    </div>
  )
}

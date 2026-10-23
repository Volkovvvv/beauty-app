import { useEffect, useMemo, useState } from 'react'
import type { Appointment, Workday } from '../../../entities/appointment'
import { servicesMinutes, servicesPrice, servicesTitle, type Service } from '../../../entities/service'
import type { WindowEdits } from '../../story-windows'
import { cx } from '../../../shared/lib/cx'
import { addDays, dayOfMonth, fromMinutes, MONTHS, MONTHS_GEN, monthIndex, weekday, WEEKDAYS, WEEKDAYS_FULL, type ISODate } from '../../../shared/lib/date'
import { duration, rub } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { bookingDays, calendarFile } from '../model/slots'
import s from './BookingPreviewPage.module.css'

interface BookingPreviewPageProps {
  /** «Вика · ногти» */
  title: string
  /** «Ногти · Таганская, 24» */
  subtitle: string
  address: string | null
  services: readonly Service[]
  appointments: readonly Appointment[]
  workday: Workday
  now: Now
  edits: WindowEdits
  onLoadEdits: (from: ISODate, to: ISODate) => void
  onBack: () => void
}

const digits = (phone: string) => phone.replace(/\D/g, '')

// Онлайн-запись (7a) глазами клиентки: услуги, день, время и контакты на одной
// странице. Пока это предпросмотр для мастера — запись не создаётся
export default function BookingPreviewPage({
  title,
  subtitle,
  address,
  services,
  appointments,
  workday,
  now,
  edits,
  onLoadEdits,
  onBack,
}: BookingPreviewPageProps) {
  const offered = useMemo(() => services.filter((svc) => svc.online), [services])
  const [picked, setPicked] = useState<ReadonlySet<string>>(() => new Set(offered[0] ? [offered[0].id] : []))
  const [date, setDate] = useState<ISODate | null>(null)
  const [start, setStart] = useState<number | null>(null)
  const [sheet, setSheet] = useState(false)
  const [done, setDone] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    onLoadEdits(now.date, addDays(now.date, 30))
  }, [now.date, onLoadEdits])

  const chosen = offered.filter((svc) => picked.has(svc.id))
  const minutes = servicesMinutes(chosen)
  const price = servicesPrice(chosen)
  const days = useMemo(() => bookingDays(appointments, workday, now, edits, minutes), [appointments, workday, now, edits, minutes])

  // Выбранный день по умолчанию — ближайший со свободным временем
  const day = days.find((d) => d.date === date) ?? days.find((d) => d.times.length) ?? days[0]
  const time = start !== null && day.times.includes(start) ? start : null
  const contactsReady = name.trim().length > 0 && digits(phone).length >= 10

  const when = time !== null ? `${dayOfMonth(day.date)} ${MONTHS_GEN[monthIndex(day.date)]}, ${WEEKDAYS_FULL[weekday(day.date)].toLowerCase()} · ${fromMinutes(time)}` : ''
  const list = chosen.length ? servicesTitle(chosen) : 'Услуга не выбрана'

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const saveToCalendar = () => {
    if (time === null) return
    const url = URL.createObjectURL(calendarFile(day.date, time, minutes, `${list} · ${title}`, address ?? ''))
    const link = document.createElement('a')
    link.href = url
    link.download = 'zapis.ics'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  if (done) {
    return (
      <div className={s.done}>
        <span className={s.doneMark}>✓</span>
        <span className={s.doneTitle}>Вы записаны</span>
        <span className={s.doneWhen}>
          {when}
          <br />
          {list}
        </span>
        <span className={s.doneText}>
          Напомним за день и за 2 часа до визита.{address ? ` Адрес: ${address}.` : ''}
        </span>
        <span className={s.spacer} />
        <span className={s.previewNote}>Это предпросмотр — запись не создана</span>
        <button type="button" className={s.doneBtn} onClick={saveToCalendar}>
          Добавить в календарь
        </button>
        <button
          type="button"
          className={s.doneGhost}
          onClick={() => {
            setDone(false)
            setStart(null)
          }}
        >
          Записаться ещё
        </button>
        <button type="button" className={s.doneGhost} onClick={onBack}>
          Закрыть предпросмотр
        </button>
      </div>
    )
  }

  return (
    <div className={s.screen}>
      <div className={s.banner}>
        <span>Предпросмотр · так клиентки увидят запись</span>
        <button type="button" className={s.bannerClose} onClick={onBack}>
          Закрыть
        </button>
      </div>

      <div className={s.head}>
        <span className={s.avatar}>{title.trim().charAt(0).toUpperCase()}</span>
        <div className={s.headText}>
          <span className={s.title}>{title}</span>
          {subtitle ? <span className={s.sub}>{subtitle}</span> : null}
        </div>
      </div>

      <div className={s.sectionHead}>
        <span className={s.sectionTitle}>Услуги</span>
        <span className={s.sectionHint}>можно несколько</span>
      </div>
      {offered.length ? (
        <div className={s.list}>
          {offered.map((svc) => {
            const on = picked.has(svc.id)
            return (
              <button key={svc.id} type="button" aria-pressed={on} className={s.service} onClick={() => toggle(svc.id)}>
                <span className={cx(s.mark, on && s.markOn)}>{on ? '✓' : ''}</span>
                <span className={s.serviceText}>
                  <span className={s.serviceName}>{svc.name}</span>
                  <span className={s.serviceMeta}>{duration(svc.minutes)}</span>
                </span>
                <span className={s.servicePrice}>{rub(svc.price)}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <span className={s.empty}>Нет услуг, открытых для онлайн-записи — включите их в «Моих услугах»</span>
      )}

      <div className={s.sectionHead}>
        <span className={s.sectionTitle}>Когда</span>
        <span className={s.sectionHint}>{MONTHS[monthIndex(day.date)].toLowerCase()}</span>
      </div>
      <div className={s.days}>
        {days.map((d) => (
          <button
            key={d.date}
            type="button"
            aria-pressed={d.date === day.date}
            className={cx(s.day, d.times.length > 0 && s.dayOpen, d.date === day.date && s.dayOn)}
            onClick={() => {
              setDate(d.date)
              setStart(null)
            }}
          >
            <span className={s.dayWd}>{WEEKDAYS[weekday(d.date)]}</span>
            <span className={s.dayNum}>{dayOfMonth(d.date)}</span>
            <span className={s.daySub}>{d.times.length ? `${d.times.length} ок` : 'вых'}</span>
          </button>
        ))}
      </div>

      {day.times.length ? (
        <div className={s.times}>
          {day.times.map((t) => (
            <button key={t} type="button" aria-pressed={t === time} className={cx(s.time, t === time && s.timeOn)} onClick={() => setStart(t)}>
              {fromMinutes(t)}
            </button>
          ))}
        </div>
      ) : (
        <div className={s.noTimes}>{workday.days.includes(weekday(day.date)) ? 'В этот день всё занято' : 'В этот день мастер не работает'}</div>
      )}

      <div className={s.cta}>
        <button type="button" className={s.ctaBtn} disabled={!chosen.length || time === null} onClick={() => setSheet(true)}>
          <span className={s.ctaTitle}>{!chosen.length ? 'Выберите услугу' : time === null ? 'Выберите время' : 'Записаться'}</span>
          <span className={s.ctaSub}>
            {time !== null
              ? `${dayOfMonth(day.date)} ${MONTHS_GEN[monthIndex(day.date)].slice(0, 3)}, ${fromMinutes(time)} · ${rub(price)}`
              : `${minutes ? duration(minutes) : '—'} · ${rub(price)}`}
          </span>
        </button>
      </div>

      {sheet ? (
        <>
          <div className={s.backdrop} onClick={() => setSheet(false)} />
          <div className={s.sheet} role="dialog" aria-modal="true" aria-label="Почти готово">
            <span className={s.grip} />
            <div className={s.sheetHead}>
              <span className={s.sheetTitle}>Почти готово</span>
              <button type="button" className={s.close} aria-label="Закрыть" onClick={() => setSheet(false)}>
                ×
              </button>
            </div>
            <div className={s.summary}>
              <span className={s.summaryWhen}>{when}</span>
              <span className={s.summaryList}>{list}</span>
              <div className={s.summaryTotal}>
                <span>{duration(minutes)}</span>
                <span>{rub(price)}</span>
              </div>
            </div>
            <label className={s.field}>
              <span className={s.fieldLabel}>Имя</span>
              <input className={s.input} value={name} maxLength={60} placeholder="Как к вам обращаться" onChange={(e) => setName(e.target.value)} />
            </label>
            <label className={s.field}>
              <span className={s.fieldLabel}>Телефон</span>
              <input
                className={s.input}
                type="tel"
                value={phone}
                maxLength={20}
                placeholder="+7 900 000-00-00"
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className={s.field}>
              <span className={s.fieldLabel}>Комментарий мастеру</span>
              <input
                className={s.input}
                value={note}
                maxLength={200}
                placeholder="Например, пришлю фото дизайна"
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button
              type="button"
              className={s.confirm}
              disabled={!contactsReady}
              onClick={() => {
                setSheet(false)
                setDone(true)
              }}
            >
              Подтвердить запись
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

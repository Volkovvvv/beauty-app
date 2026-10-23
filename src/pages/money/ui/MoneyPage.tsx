import { useEffect, useMemo, useRef, useState } from 'react'
import type { Appointment } from '../../../entities/appointment'
import type { Client } from '../../../entities/client'
import { dayOfMonth, weekday, WEEKDAYS, weekdayDayMonth, type ISODate } from '../../../shared/lib/date'
import { compact, rub } from '../../../shared/lib/format'
import { cx } from '../../../shared/lib/cx'
import type { Now } from '../../../shared/lib/useNow'
import { Button, IconButton, Panel, Screen, Segmented, Stack, StatTile, TextAction, Title } from '../../../shared/ui'
import { dayRecords, debts, monthDayTotals, moneySummary, shiftPeriod, type Debt, type Period } from '../model/summary'
import s from './MoneyPage.module.css'

const PERIODS: readonly { value: Period; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]

interface MoneyPageProps {
  appointments: readonly Appointment[]
  clientById: Map<string, Client>
  now: Now
  onRemind: (debt: Debt) => void
  /** Открыть день во вкладке «Записи» */
  onOpenDay: (date: ISODate) => void
}

export default function MoneyPage({ appointments, clientById, now, onRemind, onOpenDay }: MoneyPageProps) {
  const [period, setPeriod] = useState<Period>('week')
  // Любой день листаемого периода; по умолчанию — текущий период
  const [anchor, setAnchor] = useState(now.date)
  const m = useMemo(() => moneySummary(appointments, period, anchor, now.date), [appointments, period, anchor, now.date])
  const owed = useMemo(() => debts(appointments, clientById), [appointments, clientById])
  const isDay = period === 'day'
  const strip = useMemo(() => (isDay ? monthDayTotals(appointments, anchor) : []), [isDay, appointments, anchor])
  const records = useMemo(() => (isDay ? dayRecords(appointments, anchor, clientById) : []), [isDay, appointments, anchor, clientById])
  const max = Math.max(1, ...m.bars.map((b) => b.value))
  const top = m.services[0]?.value || 1

  // Выбранный день ленты — по центру: при открытии сразу, при листании плавно
  const stripRef = useRef<HTMLDivElement>(null)
  const scrolled = useRef(false)
  useEffect(() => {
    if (!isDay) {
      scrolled.current = false
      return
    }
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')
    const box = stripRef.current
    if (!el || !box) return
    box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2, behavior: scrolled.current ? 'smooth' : 'auto' })
    scrolled.current = true
  }, [isDay, anchor])

  const openDay = (date: ISODate) => {
    setPeriod('day')
    setAnchor(date)
  }

  return (
    <Screen>
      <header className={s.header}>
        <Title>Деньги</Title>
        <Segmented
          label="Период"
          options={PERIODS}
          value={period}
          onChange={(p) => {
            setPeriod(p)
            setAnchor(now.date)
          }}
        />
      </header>

      <div className={s.total}>
        <div className={s.periodRow}>
          <IconButton label="Раньше" variant="white" onClick={() => setAnchor(shiftPeriod(period, anchor, -1))}>‹</IconButton>
          <span className={s.caption}>{m.caption}</span>
          <IconButton label="Позже" variant="white" onClick={() => setAnchor(shiftPeriod(period, anchor, 1))}>›</IconButton>
          {m.current ? null : <TextAction onClick={() => setAnchor(now.date)}>{isDay ? 'К сегодня' : 'К текущей'}</TextAction>}
        </div>
        <span className={s.amount}>{rub(m.total)}</span>
        {m.delta ? (
          <span className={cx(s.delta, m.delta.value < 0 && s.down, isDay && !m.delta.value && s.neutral)}>{m.delta.label}</span>
        ) : null}
      </div>

      {isDay ? (
        <div ref={stripRef} className={s.strip}>
          {strip.map((d) => (
            <button
              key={d.date}
              type="button"
              aria-pressed={d.date === anchor}
              className={cx(s.stripDay, d.date === anchor && s.stripOn, d.date === now.date && s.stripToday)}
              onClick={() => setAnchor(d.date)}
            >
              <span className={s.stripWd}>{WEEKDAYS[weekday(d.date)]}</span>
              <span className={s.stripNum}>{dayOfMonth(d.date)}</span>
              <span className={s.stripSum}>{d.total ? compact(d.total) : '—'}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={s.chart}>
          <div className={s.bars}>
            {m.bars.map((b) => {
              const date = b.date
              const column = (
                <>
                  <span className={s.barValue}>{compact(b.value)}</span>
                  <span
                    className={cx(s.bar, b.highlight && s.barActive)}
                    style={{ height: `${Math.max(4, (b.value / max) * 100)}px` }}
                  />
                </>
              )
              return date ? (
                <button
                  key={b.label}
                  type="button"
                  className={cx(s.barCol, s.barButton)}
                  aria-label={`${weekdayDayMonth(date)}: ${rub(b.value)}`}
                  onClick={() => openDay(date)}
                >
                  {column}
                </button>
              ) : (
                <div key={b.label} className={s.barCol}>
                  {column}
                </div>
              )
            })}
          </div>
          <div className={s.labels}>
            {m.bars.map((b) => (
              <span key={b.label} className={cx(s.label, b.highlight && s.labelActive)}>{b.label}</span>
            ))}
          </div>
          {period === 'week' ? <span className={s.barsHint}>Нажмите на день, чтобы открыть детали</span> : null}
        </div>
      )}

      <div className={s.stats}>
        <StatTile label="Средний чек" value={rub(m.avgCheck)} />
        <StatTile label="Материалы" value={`−${rub(m.materials)}`} />
      </div>

      {isDay ? (
        <Stack gap={10}>
          <Title size="md" as="h2">Записи дня</Title>
          <Panel list>
            {records.length ? (
              records.map((r) => (
                <button key={r.id} type="button" className={s.recordRow} onClick={() => onOpenDay(anchor)}>
                  <span className={s.recordTime}>{r.start}</span>
                  <span className={s.dayText}>
                    <span className={s.dayName}>{r.client}</span>
                    <span className={s.recordMeta}>{r.title}</span>
                  </span>
                  <span className={s.daySum}>{rub(r.price)}</span>
                </button>
              ))
            ) : (
              <span className={cx(s.empty, s.emptyRow)}>В этот день записей не было</span>
            )}
          </Panel>
        </Stack>
      ) : m.days.length ? (
        <Stack gap={10}>
          <Title size="md" as="h2">По дням</Title>
          <Panel list>
            {m.days.map((d) => (
              <button key={d.date} type="button" className={s.dayRow} onClick={() => onOpenDay(d.date)}>
                <span className={s.dayText}>
                  <span className={s.dayName}>{weekdayDayMonth(d.date)}</span>
                  <span className={s.dayMeta}>{d.upcoming ? `${d.count} · впереди` : d.count}</span>
                </span>
                <span className={cx(s.daySum, d.upcoming && s.daySumUpcoming)}>{rub(d.total)}</span>
              </button>
            ))}
          </Panel>
        </Stack>
      ) : (
        <Panel>
          <span className={s.empty}>В этот период записей не было</span>
        </Panel>
      )}

      {!isDay && m.services.length ? (
        <Stack gap={10}>
          <Title size="md" as="h2">По услугам</Title>
          <Panel list>
            {m.services.map((svc) => (
              <div key={svc.name} className={s.service}>
                <div className={s.serviceHead}>
                  <span>{svc.name}</span>
                  <span>{rub(svc.value)}</span>
                </div>
                <div className={s.track}>
                  <span className={s.fill} style={{ width: `${Math.round((svc.value / top) * 100)}%` }} />
                </div>
              </div>
            ))}
          </Panel>
        </Stack>
      ) : null}

      {owed.map((d) => (
        <Panel key={d.id}>
          <div className={s.debt}>
            <span className={s.debtLabel}>Ждут оплаты</span>
            <span className={s.debtWho}>
              {d.client?.name} · {rub(d.amount)}
            </span>
            <span className={s.debtNote}>{d.note}</span>
          </div>
          <Button variant="dark" size="sm" onClick={() => onRemind(d)}>
            Напомнить
          </Button>
        </Panel>
      ))}
    </Screen>
  )
}

import { useMemo, useState } from 'react'
import type { Appointment } from '../../../entities/appointment'
import type { Client } from '../../../entities/client'
import { compact, rub } from '../../../shared/lib/format'
import { cx } from '../../../shared/lib/cx'
import type { Now } from '../../../shared/lib/useNow'
import { Button, Panel, Screen, Segmented, Stack, StatTile, Title } from '../../../shared/ui'
import { debts, moneySummary, type Debt, type Period } from '../model/summary'
import s from './MoneyPage.module.css'

const PERIODS: readonly { value: Period; label: string }[] = [
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]

interface MoneyPageProps {
  appointments: readonly Appointment[]
  clientById: Map<string, Client>
  now: Now
  onRemind: (debt: Debt) => void
}

export default function MoneyPage({ appointments, clientById, now, onRemind }: MoneyPageProps) {
  const [period, setPeriod] = useState<Period>('week')
  const m = useMemo(() => moneySummary(appointments, period, now.date), [appointments, period, now.date])
  const owed = useMemo(() => debts(appointments, clientById), [appointments, clientById])
  const max = Math.max(1, ...m.bars.map((b) => b.value))
  const top = m.services[0]?.value || 1

  return (
    <Screen>
      <header className={s.header}>
        <Title>Деньги</Title>
        <Segmented label="Период" options={PERIODS} value={period} onChange={setPeriod} />
      </header>

      <div className={s.total}>
        <span className={s.caption}>{m.caption}</span>
        <span className={s.amount}>{rub(m.total)}</span>
        {m.delta ? <span className={cx(s.delta, m.delta.value < 0 && s.down)}>{m.delta.label}</span> : null}
      </div>

      <div className={s.chart}>
        <div className={s.bars}>
          {m.bars.map((b) => (
            <div key={b.label} className={s.barCol}>
              <span className={s.barValue}>{compact(b.value)}</span>
              <span
                className={cx(s.bar, b.highlight && s.barActive)}
                style={{ height: `${Math.max(4, (b.value / max) * 100)}px` }}
              />
            </div>
          ))}
        </div>
        <div className={s.labels}>
          {m.bars.map((b) => (
            <span key={b.label} className={cx(s.label, b.highlight && s.labelActive)}>{b.label}</span>
          ))}
        </div>
      </div>

      <div className={s.stats}>
        <StatTile label="Средний чек" value={rub(m.avgCheck)} />
        <StatTile label="Материалы" value={`−${rub(m.materials)}`} />
      </div>

      {m.services.length ? (
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

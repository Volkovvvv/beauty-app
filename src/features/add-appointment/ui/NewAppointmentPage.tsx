import { useMemo, useState } from 'react'
import { servicesMinutes, servicesPrice, type Service } from '../../../entities/service'
import type { Appointment, Workday } from '../../../entities/appointment'
import { clientHint, clientStats, initials, type Client } from '../../../entities/client'
import { addDays, dayOfMonth, fromMinutes, MONTHS_SHORT, monthIndex, weekday, WEEKDAYS, type ISODate } from '../../../shared/lib/date'
import { duration, plural, rub } from '../../../shared/lib/format'
import { cx } from '../../../shared/lib/cx'
import { useMaster } from '../../../entities/master'
import type { Now } from '../../../shared/lib/useNow'
import { Avatar, BottomBar, Button, ChoiceChip, IconButton, Panel, Screen, Stack, TextAction, Title, ToggleRow } from '../../../shared/ui'
import { daySlots, pickableDays } from '../model/slots'
import type { BookingInitial, BookingResult } from '../model/types'
import ClientPicker from './ClientPicker'
import s from './NewAppointmentPage.module.css'

const dayLabel = (date: ISODate) => `${WEEKDAYS[weekday(date)]}, ${dayOfMonth(date)} ${MONTHS_SHORT[monthIndex(date)]}`

interface NewAppointmentPageProps {
  /** Действующий прайс мастера */
  services: readonly Service[]
  workday: Workday
  clients: readonly Client[]
  appointments: readonly Appointment[]
  now: Now
  initial: BookingInitial
  onSave: (result: BookingResult, replaceId?: string) => void
  /** Новая клиентка из шторки выбора: форма вернёт сюда с её id */
  onAddClient: (state: BookingInitial) => void
  onCancel: () => void
}

// Новая запись или перенос существующей (initial.replaceId)
export default function NewAppointmentPage({ services, workday, clients, appointments, now, initial, onSave, onAddClient, onCancel }: NewAppointmentPageProps) {
  const { wording } = useMaster()
  const [clientId, setClientId] = useState(initial.clientId ?? null)
  const [selected, setSelected] = useState(() => new Set(initial.serviceIds ?? []))
  const [date, setDate] = useState(() => {
    if (initial.date && initial.date > now.date) return initial.date
    // Сегодня свободного времени не осталось — сразу предлагаем завтра
    const picked = new Set(initial.serviceIds ?? [])
    const minutes = servicesMinutes(services.filter((s) => picked.has(s.id)))
    const today = daySlots({ appointments, date: now.date, minutes, now, workday })
    return today.some((t) => !t.busy) ? now.date : addDays(now.date, 1)
  })
  const [start, setStart] = useState<number | null>(initial.start ?? null)
  const [remind, setRemind] = useState(true)
  const [rebook, setRebook] = useState(true)
  const [picking, setPicking] = useState(false)

  const client = clients.find((c) => c.id === clientId) ?? null
  const hint = useMemo(() => {
    if (!client) return ''
    const mine = appointments.filter((a) => a.clientId === client.id)
    return clientHint(clientStats(client, mine, now), now.date, wording.correction)
  }, [client, appointments, now, wording.correction])

  // В порядке прайса, а не в порядке нажатий
  const chosenServices = services.filter((svc) => selected.has(svc.id))
  const minutes = servicesMinutes(chosenServices)
  const price = servicesPrice(chosenServices)

  const days = pickableDays(now.date, initial.date && initial.date > now.date ? initial.date : now.date)
  const extra = date === initial.date ? initial.start : undefined
  const slots = useMemo(
    () => daySlots({ appointments, date, minutes, now, workday, ignoreId: initial.replaceId, extra }),
    [appointments, date, minutes, now, workday, initial.replaceId, extra]
  )
  // Выбранное время сбрасывается само, если после смены услуг или дня оно занято
  const chosen = slots.some((t) => t.start === start && !t.busy) ? start : null
  const repeatWeeks = client?.repeatWeeks ?? 3

  const toggleService = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const pickClient = (c: Client, lastServiceIds: string[]) => {
    setClientId(c.id)
    setPicking(false)
    setSelected((prev) => (prev.size ? prev : new Set(lastServiceIds)))
  }

  const save = () => {
    if (!clientId || !chosenServices.length || chosen === null) return
    onSave(
      { clientId, date, start: fromMinutes(chosen), services: chosenServices, note: initial.note, remind, rebook },
      initial.replaceId
    )
  }

  const ready = Boolean(client && chosenServices.length && chosen !== null)
  const summary = [
    dayLabel(date) + (chosen !== null ? `, ${fromMinutes(chosen)}` : ''),
    minutes ? duration(minutes) : 'нет услуг',
  ].join(' · ')

  return (
    <>
      <Screen>
        <div className={s.header}>
          <IconButton label="Назад" variant="white" onClick={onCancel}>‹</IconButton>
          <Title size="lg">{initial.replaceId ? 'Перенос записи' : 'Новая запись'}</Title>
        </div>

        <Panel>
          {client ? (
            <>
              <Avatar text={initials(client.name)} tone="rose" />
              <div className={s.clientText}>
                <span className={s.clientName}>{client.name}</span>
                <span className={s.clientHint}>{hint}</span>
              </div>
              {initial.replaceId ? null : <TextAction onClick={() => setPicking(true)}>Сменить</TextAction>}
            </>
          ) : (
            <button type="button" className={s.choose} onClick={() => setPicking(true)}>
              <Avatar text="+" tone="rose" />
              <span className={s.clientName}>Выбрать клиентку</span>
            </button>
          )}
        </Panel>

        <Stack gap={10}>
          <span className={s.label}>Услуги</span>
          <div className={s.services}>
            {services.map((svc) => (
              <ChoiceChip
                key={svc.id}
                selected={selected.has(svc.id)}
                onToggle={() => toggleService(svc.id)}
                title={svc.name}
                meta={`${duration(svc.minutes)} · ${rub(svc.price)}`}
              />
            ))}
          </div>
        </Stack>

        <Stack gap={10}>
          <div className={s.labelRow}>
            <span className={s.label}>Когда</span>
            <span className={s.hint}>Слоты под {minutes ? duration(minutes) : '—'}</span>
          </div>
          <div className={s.days}>
            {days.map((d) => (
              <button
                key={d}
                type="button"
                aria-pressed={d === date}
                className={cx(s.day, d === date && s.dayOn)}
                onClick={() => setDate(d)}
              >
                <span className={s.dayWeek}>{WEEKDAYS[weekday(d)]}</span>
                <span className={s.dayNum}>{dayOfMonth(d)}</span>
              </button>
            ))}
          </div>
          <div className={s.slots}>
            {slots.map((t) => (
              <button
                key={t.start}
                type="button"
                disabled={t.busy}
                aria-pressed={t.start === chosen}
                className={cx(s.slot, t.busy && s.slotBusy, t.start === chosen && s.slotOn)}
                onClick={() => setStart(t.start)}
              >
                {fromMinutes(t.start)}
              </button>
            ))}
          </div>
        </Stack>

        <Panel list>
          <ToggleRow title="Напомнить клиентке" hint="Бот напишет за день и за 2 часа" checked={remind} onChange={setRemind} />
          <ToggleRow
            title={wording.correction ? 'Позвать на коррекцию' : 'Позвать снова'}
            hint={`Через ${repeatWeeks} ${plural(repeatWeeks, ['неделю', 'недели', 'недель'])} бот предложит записаться`}
            checked={rebook}
            onChange={setRebook}
          />
        </Panel>
      </Screen>

      <BottomBar dark>
        <div className={s.total}>
          <span className={s.totalSum}>{rub(price)}</span>
          <span className={s.totalMeta}>{summary}</span>
        </div>
        <Button variant="pearl" disabled={!ready} onClick={save}>
          {initial.replaceId ? 'Перенести' : 'Записать'}
        </Button>
      </BottomBar>

      {picking ? (
        <ClientPicker
          clients={clients}
          appointments={appointments}
          now={now}
          onPick={pickClient}
          onAddClient={() =>
            onAddClient({ ...initial, date, start: chosen ?? undefined, serviceIds: chosenServices.map((s) => s.id) })
          }
          onClose={() => setPicking(false)}
        />
      ) : null}
    </>
  )
}

import { appointmentTitle, endOf, startOf, type Appointment } from '../../../entities/appointment'
import type { Client } from '../../../entities/client'
import { addDays, dayOfMonth, fromMinutes, MONTHS_SHORT, monthIndex } from '../../../shared/lib/date'
import { rub } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import s from './NextAppointmentCard.module.css'

// Крупно справа: сколько ждать до записи, сколько осталось до конца
// или как давно должна была начаться
function countdown(appointment: Appointment, now: Now): { value: string | number; unit: string } {
  if (appointment.date !== now.date) {
    return { value: dayOfMonth(appointment.date), unit: MONTHS_SHORT[monthIndex(appointment.date)] }
  }
  const left =
    appointment.status === 'arrived' ? endOf(appointment) - now.minutes : startOf(appointment) - now.minutes
  const suffix = left < 0 ? ' назад' : ''
  const abs = Math.abs(left)
  if (abs < 60) return { value: abs, unit: `мин${suffix}` }
  return { value: String(Math.round(abs / 30) / 2).replace('.', ','), unit: `ч${suffix}` }
}

function badge(appointment: Appointment, now: Now): string {
  if (appointment.status === 'arrived') return 'Сейчас'
  if (appointment.date === addDays(now.date, 1)) return 'Завтра'
  if (appointment.date === now.date && startOf(appointment) <= now.minutes) return 'Началась, ждём'
  return 'Следующая'
}

// Что известно о напоминании: бот не видит, прочитано ли сообщение, — только ответ кнопкой
function reminderTag(appointment: Appointment, client: Client): string {
  if (appointment.declined) return 'Написала, что не сможет ✕'
  if (appointment.confirmed) return 'Подтвердила ✓'
  if (appointment.reminded) return 'Напоминание отправлено'
  if (client.inviteStatus !== 'accepted') return 'Не подключена к боту'
  return appointment.remind ? 'Бот напомнит заранее' : 'Без напоминания'
}

interface NextAppointmentCardProps {
  appointment: Appointment
  client: Client
  now: Now
  onArrived: () => void
  onDone: () => void
  onOpen: () => void
  onWrite: () => void
}

// Вишнёвая карточка ближайшей записи на «Сегодня»
export default function NextAppointmentCard({ appointment, client, now, onArrived, onDone, onOpen, onWrite }: NextAppointmentCardProps) {
  const { value, unit } = countdown(appointment, now)
  const isToday = appointment.date === now.date
  const arrived = appointment.status === 'arrived'

  return (
    <section className={s.card} aria-label="Ближайшая запись">
      <span className={s.gloss} aria-hidden="true" />

      <div className={s.top}>
        <span className={s.badge}>{badge(appointment, now)}</span>
        <span className={s.range}>
          {appointment.start} – {fromMinutes(endOf(appointment))}
        </span>
      </div>

      <div className={s.main}>
        <button type="button" className={s.who} onClick={onOpen}>
          <span className={s.name}>{client.name}</span>
          <span className={s.services}>{appointmentTitle(appointment)}</span>
        </button>
        <div className={s.count}>
          <span className={s.value}>{value}</span>
          <span className={s.unit}>{unit}</span>
        </div>
      </div>

      <div className={s.tags}>
        {client.card.shape ? <span className={s.tag}>{client.card.shape}</span> : null}
        {client.card.allergy ? <span className={s.tag}>Аллергия: {client.card.allergy}</span> : null}
        <span className={s.tag}>{reminderTag(appointment, client)}</span>
      </div>

      <div className={s.actions}>
        {!isToday ? (
          <button type="button" className={s.primary} onClick={onOpen}>Открыть карточку</button>
        ) : arrived ? (
          <button type="button" className={s.primary} onClick={onDone}>Готово · {rub(appointment.price)}</button>
        ) : (
          <button type="button" className={s.primary} onClick={onArrived}>Клиентка пришла</button>
        )}
        <button type="button" className={s.write} aria-label="Написать" onClick={onWrite}>✉</button>
      </div>
    </section>
  )
}

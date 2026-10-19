// Граница форматов между API и интерфейсом. Сервер хранит копейки, момент
// начала (timestamptz) и статусы КАПСОМ; интерфейс — рубли, дату и время
// в часовом поясе устройства. Конвертация — только здесь.
import type { Appointment, AppointmentDraft, AppointmentStatus } from '../../entities/appointment'
import type { Client, ClientCard, InviteStatus } from '../../entities/client'
import type { Master, Specialty } from '../../entities/master'
import type { Service } from '../../entities/service'
import { toISO, type ISODate, type Time } from '../../shared/lib/date'

export interface ApiService {
  id: string
  name: string
  minutes: number
  price: number
  cost: number
}

export interface ApiClient {
  id: string
  name: string
  repeatWeeks: number
  shape: string | null
  likes: string | null
  allergy: string | null
  payment: string | null
  inviteStatus: 'NONE' | 'INVITED' | 'ACCEPTED'
  username: string | null
  photos: { id: string; label: string }[]
}

export interface ApiAppointment {
  id: string
  clientId: string
  startsAt: string
  duration: number
  services: ApiService[]
  price: number
  note: string | null
  status: 'PLANNED' | 'ARRIVED' | 'DONE' | 'CANCELLED'
  paid: number
  confirmedAt: string | null
  declinedAt: string | null
  remindedAt: string | null
  remind: boolean
  rebook: boolean
}

export interface ApiMaster {
  displayName: string | null
  telegramName: string
  dayStart: number
  dayEnd: number
  specialties: string[]
  onboardedAt: string | null
}

export interface ApiSpecialty {
  id: string
  label: string
  summary: string
  cardLabel: string
  correction: boolean
  repeatWeeks: number
}

const rub = (kopecks: number) => Math.round(kopecks / 100)
const kop = (rubles: number) => Math.round(rubles * 100)

const pad = (n: number) => String(n).padStart(2, '0')

/** Момент начала → дата и время в поясе устройства: мастер ставит записи в своём времени */
function splitStartsAt(iso: string): { date: ISODate; start: Time } {
  const d = new Date(iso)
  return { date: toISO(d), start: `${pad(d.getHours())}:${pad(d.getMinutes())}` }
}

/** Дата и время без зоны трактуются как местные — это и нужно */
export const startsAtToApi = (date: ISODate, start: Time): string => new Date(`${date}T${start}:00`).toISOString()

const INVITE: Record<ApiClient['inviteStatus'], InviteStatus> = { NONE: 'none', INVITED: 'invited', ACCEPTED: 'accepted' }

export const serviceFromApi = (s: ApiService): Service => ({
  id: s.id,
  name: s.name,
  minutes: s.minutes,
  price: rub(s.price),
  cost: rub(s.cost),
})

export const clientFromApi = (c: ApiClient): Client => ({
  id: c.id,
  name: c.name,
  username: c.username,
  inviteStatus: INVITE[c.inviteStatus] ?? 'none',
  repeatWeeks: c.repeatWeeks,
  card: {
    shape: c.shape ?? undefined,
    likes: c.likes ?? undefined,
    allergy: c.allergy ?? undefined,
    payment: c.payment ?? undefined,
  },
  photos: c.photos.map((p) => ({ id: p.id, label: p.label })),
})

export const appointmentFromApi = (a: ApiAppointment): Appointment => ({
  id: a.id,
  clientId: a.clientId,
  ...splitStartsAt(a.startsAt),
  minutes: a.duration,
  services: a.services.map(serviceFromApi),
  price: rub(a.price),
  note: a.note ?? undefined,
  status: a.status.toLowerCase() as AppointmentStatus,
  paid: rub(a.paid),
  confirmed: a.confirmedAt !== null,
  declined: a.declinedAt !== null,
  reminded: a.remindedAt !== null,
  remind: a.remind,
  rebook: a.rebook,
})

export const appointmentToApi = (d: AppointmentDraft) => ({
  clientId: d.clientId,
  startsAt: startsAtToApi(d.date, d.start),
  serviceIds: d.services.map((s) => s.id),
  ...(d.note ? { note: d.note } : {}),
  remind: d.remind,
  rebook: d.rebook,
})

export const statusToApi = (s: AppointmentStatus) => s.toUpperCase() as ApiAppointment['status']

export const paidToApi = kop

export const masterFromApi = (m: ApiMaster): Master => ({
  name: m.displayName ?? m.telegramName.split(' ')[0],
  telegramName: m.telegramName,
  workday: { start: m.dayStart, end: m.dayEnd },
  specialties: m.specialties,
  onboarded: m.onboardedAt !== null,
})

export const specialtyFromApi = (s: ApiSpecialty): Specialty => ({
  id: s.id,
  label: s.label,
  cardLabel: s.cardLabel,
  correction: s.correction,
  repeatWeeks: s.repeatWeeks,
  summary: s.summary,
})

/** Правка услуги прайса: рубли → копейки */
export const serviceToApi = (s: Omit<Service, 'id'>) => ({
  name: s.name,
  minutes: s.minutes,
  price: kop(s.price),
  cost: kop(s.cost),
})

/** Новая клиентка из формы. Пустые поля не шлём — сервер подставит умолчания */
export interface ClientInput extends ClientCard {
  name: string
  repeatWeeks?: number
}

export const clientToApi = (c: ClientInput) => ({
  name: c.name,
  ...(c.repeatWeeks ? { repeatWeeks: c.repeatWeeks } : {}),
  ...(c.shape ? { shape: c.shape } : {}),
  ...(c.likes ? { likes: c.likes } : {}),
  ...(c.allergy ? { allergy: c.allergy } : {}),
  ...(c.payment ? { payment: c.payment } : {}),
})

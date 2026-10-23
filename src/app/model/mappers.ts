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
  category: string
  online: boolean
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
  address: string | null
  instagram: string | null
  telegramName: string
  username: string | null
  dayStart: number
  dayEnd: number
  workDays: number[]
  specialties: string[]
  onboardedAt: string | null
}

/** Ручная правка окон дня: начала часов, минуты от полуночи */
export interface ApiWindowEdit {
  date: ISODate
  add: number[]
  rem: number[]
}

export interface ApiSpecialty {
  id: string
  label: string
  summary: string
  cardLabel: string
  correction: boolean
  repeatWeeks: number
  suggestions: { name: string; minutes: number }[]
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
  category: s.category,
  online: s.online,
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
  duration: d.minutes,
  ...(d.note ? { note: d.note } : {}),
  remind: d.remind,
  rebook: d.rebook,
})

export const statusToApi = (s: AppointmentStatus) => s.toUpperCase() as ApiAppointment['status']

export const paidToApi = kop

export const masterFromApi = (m: ApiMaster): Master => ({
  name: m.displayName ?? m.telegramName.split(' ')[0],
  telegramName: m.telegramName,
  username: m.username,
  address: m.address,
  instagram: m.instagram,
  workday: { start: m.dayStart, end: m.dayEnd, days: m.workDays },
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
  suggestions: s.suggestions,
})

/** Правка услуги прайса: рубли → копейки */
export const serviceToApi = (s: Omit<Service, 'id'>) => ({
  name: s.name,
  minutes: s.minutes,
  price: kop(s.price),
  category: s.category,
  online: s.online,
})

/** Знакомство целиком: о себе, сферы и свои услуги */
export interface OnboardingInput {
  displayName: string
  address: string
  instagram: string
  specialties: string[]
  services: { name: string; minutes: number; price: number; category: string }[]
}

export const onboardingToApi = (o: OnboardingInput) => ({
  ...o,
  services: o.services.map((s) => ({ ...s, price: kop(s.price) })),
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

import { useCallback, useEffect, useRef, useState } from 'react'
import { servicesPrice, type Service } from '../../entities/service'
import type { Appointment, AppointmentDraft, AppointmentStatus } from '../../entities/appointment'
import type { Client } from '../../entities/client'
import type { Master, Specialty } from '../../entities/master'
import type { WindowEdit, WindowEdits } from '../../features/story-windows'
import type { ISODate } from '../../shared/lib/date'
import { api, getAll, login } from '../../shared/api/client'
import { haptic } from '../../shared/api/telegram'
import { newId } from '../../shared/lib/id'
import { fileToJpegBase64 } from '../../shared/lib/image'
import {
  appointmentFromApi,
  appointmentToApi,
  clientFromApi,
  clientToApi,
  masterFromApi,
  paidToApi,
  serviceFromApi,
  serviceToApi,
  specialtyFromApi,
  startsAtToApi,
  statusToApi,
  type ApiAppointment,
  type ApiClient,
  type ApiMaster,
  type ApiService,
  type ApiSpecialty,
  type ApiWindowEdit,
  type ClientInput,
  type OnboardingInput,
  onboardingToApi,
} from './mappers'

/** Правка профиля: имя, адрес, Instagram, сферы, рабочие дни */
export interface MasterPatch {
  displayName?: string
  address?: string
  instagram?: string
  specialties?: string[]
  workDays?: number[]
}

export interface Store {
  ready: boolean
  authError: string | null
  retryBoot: () => void
  master: Master | null
  /** Каталог направлений с сервера */
  specialties: Specialty[]
  services: Service[]
  clients: Client[]
  appointments: Appointment[]
  addAppointment: (draft: AppointmentDraft) => void
  rescheduleAppointment: (id: string, draft: AppointmentDraft) => void
  setStatus: (id: string, status: AppointmentStatus, paid?: number) => void
  addPhoto: (clientId: string, file: File) => void
  inviteClient: (clientId: string) => Promise<string>
  updateMaster: (patch: MasterPatch) => Promise<void>
  /** Знакомство при первом входе: ждёт ответа, ошибку показывает экран */
  completeOnboarding: (input: OnboardingInput) => Promise<void>
  addService: (service: Omit<Service, 'id'>) => void
  updateService: (id: string, service: Omit<Service, 'id'>) => void
  removeService: (id: string) => void
  addClient: (input: ClientInput) => Promise<Client>
  /** Ручные правки окон для сторис на месяц, по дням */
  windowEdits: WindowEdits
  loadWindowEdits: (from: ISODate, to: ISODate) => void
  /** null — день возвращается к расчёту по расписанию */
  saveWindowEdits: (changes: Readonly<Record<ISODate, WindowEdit | null>>) => void
}

/**
 * Ошибки фоновых запросов уходят глобальным событием: App показывает их тостом.
 * Тащить систему уведомлений в стор незачем.
 */
function reportError(message: string): void {
  window.dispatchEvent(new CustomEvent('api-error', { detail: message }))
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Не удалось связаться с сервером')

const POLL_MS = 15_000
const TEMP = 'tmp-'

const patchItem =
  <T extends { id: string }>(id: string, patch: Partial<T>) =>
  (list: T[]): T[] =>
    list.map((x) => (x.id === id ? { ...x, ...patch } : x))

/** Ответ сервера + ещё не сохранённые локальные записи: опрос не должен стирать их на лету */
const mergePending = (server: Appointment[]) => (local: Appointment[]) => {
  const pending = local.filter((a) => a.id.startsWith(TEMP))
  const next = pending.length ? [...server, ...pending] : server
  // Ничего не изменилось — не перерисовываем приложение впустую
  return JSON.stringify(next) === JSON.stringify(local) ? local : next
}

const sameJson = <T>(next: T) => (prev: T) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next)

/**
 * Данные с бэкенда. Действия оптимистичны: экран меняется сразу, запрос уходит
 * в фоне; не удался — правка откатывается и показывается ошибка.
 */
export function useStore(): Store {
  const [ready, setReady] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [bootAttempt, setBootAttempt] = useState(0)
  const [master, setMaster] = useState<Master | null>(null)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [windowEdits, setWindowEdits] = useState<WindowEdits>({})
  const windowEditsRef = useRef(windowEdits)
  windowEditsRef.current = windowEdits
  // Актуальный список для обработчиков: им нужно состояние до правки,
  // а зависеть от списка значило бы пересоздавать их на каждое изменение
  const appointmentsRef = useRef(appointments)
  appointmentsRef.current = appointments
  const servicesRef = useRef(services)
  servicesRef.current = services

  // Вход и первая загрузка. Списки независимы — грузим параллельно
  useEffect(() => {
    let cancelled = false
    setAuthError(null)
    login()
      .then(() =>
        Promise.all([
          api.get<ApiMaster>('/master'),
          api.get<ApiService[]>('/services'),
          getAll<ApiClient>('/clients'),
          getAll<ApiAppointment>('/appointments'),
          api.get<ApiSpecialty[]>('/master/specialties'),
        ])
      )
      .then(([m, s, c, a, catalog]) => {
        if (cancelled) return
        setMaster(masterFromApi(m))
        setSpecialties(catalog.map(specialtyFromApi))
        setServices(s.map(serviceFromApi))
        setClients(c.map(clientFromApi))
        setAppointments(a.map(appointmentFromApi))
        setReady(true)
      })
      .catch((e: unknown) => {
        if (!cancelled) setAuthError(errorText(e))
      })
    return () => {
      cancelled = true
    }
  }, [bootAttempt])

  const retryBoot = useCallback(() => setBootAttempt((n) => n + 1), [])

  // Ответы клиенток на напоминания и подключение к боту меняет сервер, а не это
  // приложение. Опрашиваем, пока экран виден; при возврате в приложение — сразу.
  useEffect(() => {
    if (!ready) return undefined
    const refresh = () => {
      if (document.hidden) return
      Promise.all([getAll<ApiClient>('/clients'), getAll<ApiAppointment>('/appointments')])
        .then(([c, a]) => {
          setClients(sameJson(c.map(clientFromApi)))
          setAppointments(mergePending(a.map(appointmentFromApi)))
        })
        .catch(() => {
          // Сеть моргнула — пробуем на следующем тике, фоновый опрос ошибками не заваливает
        })
    }
    const id = setInterval(refresh, POLL_MS)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [ready])

  const addAppointment = useCallback((draft: AppointmentDraft) => {
    const temp: Appointment = {
      id: newId(TEMP),
      clientId: draft.clientId,
      date: draft.date,
      start: draft.start,
      minutes: draft.minutes,
      services: draft.services,
      price: servicesPrice(draft.services),
      note: draft.note,
      status: 'planned',
      paid: 0,
      confirmed: false,
      declined: false,
      reminded: false,
      remind: draft.remind,
      rebook: draft.rebook,
    }
    setAppointments((list) => [...list, temp])
    api
      .post<ApiAppointment>('/appointments', appointmentToApi(draft))
      .then((saved) => setAppointments((list) => list.map((a) => (a.id === temp.id ? appointmentFromApi(saved) : a))))
      .catch((e: unknown) => {
        setAppointments((list) => list.filter((a) => a.id !== temp.id))
        reportError(errorText(e))
      })
  }, [])

  const rescheduleAppointment = useCallback(
    (id: string, draft: AppointmentDraft) => {
      const before = appointmentsRef.current.find((a) => a.id === id)
      if (!before) return
      const patch = {
        date: draft.date,
        start: draft.start,
        services: draft.services,
        minutes: draft.minutes,
        price: servicesPrice(draft.services),
        confirmed: false,
        declined: false,
      }
      setAppointments(patchItem<Appointment>(id, patch))
      api
        .patch<ApiAppointment>(`/appointments/${id}`, {
          startsAt: startsAtToApi(draft.date, draft.start),
          serviceIds: draft.services.map((s) => s.id),
          duration: draft.minutes,
        })
        .then((saved) => setAppointments(patchItem<Appointment>(id, appointmentFromApi(saved))))
        .catch((e: unknown) => {
          // Откатываем только эти поля: правки, прошедшие за это время, не трогаем
          setAppointments(
            patchItem<Appointment>(id, {
              date: before.date,
              start: before.start,
              services: before.services,
              minutes: before.minutes,
              price: before.price,
              confirmed: before.confirmed,
              declined: before.declined,
            })
          )
          reportError(errorText(e))
        })
    },
    []
  )

  const setStatus = useCallback(
    (id: string, status: AppointmentStatus, paid?: number) => {
      const before = appointmentsRef.current.find((a) => a.id === id)
      if (!before) return
      setAppointments(patchItem<Appointment>(id, { status, ...(paid !== undefined ? { paid } : {}) }))
      api
        .patch(`/appointments/${id}`, { status: statusToApi(status), ...(paid !== undefined ? { paid: paidToApi(paid) } : {}) })
        .catch((e: unknown) => {
          setAppointments(patchItem<Appointment>(id, { status: before.status, paid: before.paid }))
          reportError(errorText(e))
        })
    },
    []
  )

  const addPhoto = useCallback((clientId: string, file: File) => {
    const tempId = newId(TEMP)
    const localUrl = URL.createObjectURL(file)
    const label = 'Новое'
    const update = (fn: (photos: Client['photos']) => Client['photos']) =>
      setClients((list) => list.map((c) => (c.id === clientId ? { ...c, photos: fn(c.photos) } : c)))
    update((photos) => [{ id: tempId, label, localUrl }, ...photos])

    fileToJpegBase64(file)
      .then((data) => api.post<{ id: string }>(`/clients/${clientId}/photos`, { label, mime: 'image/jpeg', data }))
      // Картинку уже показываем из локальной ссылки — заново с сервера не качаем
      .then((saved) => update((photos) => photos.map((p) => (p.id === tempId ? { ...p, id: saved.id } : p))))
      .catch((e: unknown) => {
        update((photos) => photos.filter((p) => p.id !== tempId))
        URL.revokeObjectURL(localUrl)
        reportError(errorText(e))
      })
    haptic()
  }, [])

  // Возвращает готовый текст приглашения — его отправляет экран через shareText
  const inviteClient = useCallback(async (clientId: string) => {
    const { message } = await api.post<{ message: string }>(`/clients/${clientId}/invite`)
    setClients(patchItem<Client>(clientId, { inviteStatus: 'invited' }))
    return message
  }, [])

  // Ждёт ответа: экран показывает ошибку у полей (например, неверный ник Instagram)
  const updateMaster = useCallback(async (patch: MasterPatch) => {
    const saved = await api.patch<ApiMaster>('/master', patch)
    setMaster(masterFromApi(saved))
  }, [])

  // Услуги заводит сервер в той же транзакции — перечитываем их уже с id
  const completeOnboarding = useCallback(async (input: OnboardingInput) => {
    const saved = await api.post<ApiMaster>('/master/onboarding', onboardingToApi(input))
    setServices((await api.get<ApiService[]>('/services')).map(serviceFromApi))
    setMaster(masterFromApi(saved))
  }, [])

  const addService = useCallback((service: Omit<Service, 'id'>) => {
    const tempId = newId(TEMP)
    setServices((list) => [...list, { id: tempId, ...service }])
    api
      .post<ApiService>('/services', serviceToApi(service))
      .then((saved) => setServices((list) => list.map((s) => (s.id === tempId ? serviceFromApi(saved) : s))))
      .catch((e: unknown) => {
        setServices((list) => list.filter((s) => s.id !== tempId))
        reportError(errorText(e))
      })
  }, [])

  const updateService = useCallback((id: string, service: Omit<Service, 'id'>) => {
    const before = servicesRef.current.find((s) => s.id === id)
    setServices(patchItem<Service>(id, service))
    api.patch(`/services/${id}`, serviceToApi(service)).catch((e: unknown) => {
      if (before) setServices(patchItem<Service>(id, before))
      reportError(errorText(e))
    })
  }, [])

  // Убрать из прайса. Прошлые записи хранят свой снимок услуги и не меняются
  const removeService = useCallback((id: string) => {
    const index = servicesRef.current.findIndex((s) => s.id === id)
    const removed = servicesRef.current[index]
    setServices((list) => list.filter((s) => s.id !== id))
    api.delete(`/services/${id}`).catch((e: unknown) => {
      // Возвращаем на прежнее место в прайсе
      if (removed) setServices((list) => [...list.slice(0, index), removed, ...list.slice(index)])
      reportError(errorText(e))
    })
  }, [])

  // Ждёт ответа: экран сразу открывает карточку или запись с id новой клиентки
  const addClient = useCallback(async (input: ClientInput) => {
    const saved = clientFromApi(await api.post<ApiClient>('/clients', clientToApi(input)))
    setClients((list) => [...list, saved])
    return saved
  }, [])

  // Правки окон нужны только экрану месяца — грузятся, когда он открыт
  const loadWindowEdits = useCallback((from: ISODate, to: ISODate) => {
    api
      .get<ApiWindowEdit[]>(`/windows?from=${from}&to=${to}`)
      .then((list) =>
        setWindowEdits((prev) => {
          const next: Record<ISODate, WindowEdit> = {}
          for (const [date, edit] of Object.entries(prev)) if (date < from || date > to) next[date] = edit
          for (const e of list) next[e.date] = { add: e.add, rem: e.rem }
          return next
        })
      )
      .catch((e: unknown) => reportError(errorText(e)))
  }, [])

  const saveWindowEdits = useCallback((changes: Readonly<Record<ISODate, WindowEdit | null>>) => {
    const dates = Object.keys(changes)
    if (!dates.length) return
    const before = windowEditsRef.current
    const apply = (source: Readonly<Record<ISODate, WindowEdit | null | undefined>>) =>
      setWindowEdits((prev) => {
        const next = { ...prev }
        for (const date of dates) {
          const edit = source[date]
          if (edit) next[date] = edit
          else delete next[date]
        }
        return next
      })
    apply(changes)
    api
      .put('/windows', { days: dates.map((date) => ({ date, add: changes[date]?.add ?? [], rem: changes[date]?.rem ?? [] })) })
      .catch((e: unknown) => {
        // Откатываем только эти дни: правки других дней за это время не трогаем
        apply(before)
        reportError(errorText(e))
      })
  }, [])

  return {
    ready,
    authError,
    retryBoot,
    master,
    specialties,
    services,
    clients,
    appointments,
    addAppointment,
    rescheduleAppointment,
    setStatus,
    addPhoto,
    inviteClient,
    updateMaster,
    completeOnboarding,
    addService,
    updateService,
    removeService,
    addClient,
    windowEdits,
    loadWindowEdits,
    saveWindowEdits,
  }
}

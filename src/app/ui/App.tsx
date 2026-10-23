import { useCallback, useEffect, useMemo, useState } from 'react'
import { applyTheme, haptic, openChat, shareText, telegramFirstName, tg } from '../../shared/api/telegram'
import { dayMonth } from '../../shared/lib/date'
import { useNow } from '../../shared/lib/useNow'
import { AppShell, Button, EmptyState, TabBar, Toast } from '../../shared/ui'
import { DEFAULT_WORKDAY } from '../../entities/appointment'
import { indexById, type Client } from '../../entities/client'
import { MasterProvider, wordingFor } from '../../entities/master'
import { TodayPage } from '../../pages/today'
import { RecordsPage } from '../../pages/records'
import { ClientsPage } from '../../pages/clients'
import { ClientPage } from '../../pages/client'
import { MoneyPage } from '../../pages/money'
import { ProfilePage } from '../../pages/profile'
import { NewAppointmentPage, type BookingInitial, type BookingResult } from '../../features/add-appointment'
import { AddClientPage, type ClientForm } from '../../features/add-client'
import { ServicesPage } from '../../features/edit-prices'
import { OnboardingPage } from '../../features/onboarding'
import { BookingPreviewPage } from '../../features/online-booking'
import { MonthStoriesPage, MonthWindowsPage, monthStart, StorySheet, type ShareResult } from '../../features/story-windows'
import { useStore } from '../model/useStore'
import { backTarget, isTab, openView, TABS, type View } from '../model/navigation'

// Окна на месяц можно готовить на текущий и два следующих месяца
const MONTHS_AHEAD = 2

export default function App() {
  const store = useStore()
  const now = useNow()
  const [view, setView] = useState<View>({ name: 'today' })
  const [toast, setToast] = useState('')
  const [stories, setStories] = useState(false)
  // Знакомство только что пройдено: экран «Всё готово» держим, пока мастер не нажмёт «Открыть приложение»
  const [welcome, setWelcome] = useState(false)
  // Выбранный день в «Записях» живёт здесь: переживает уход на другую вкладку
  const [recordsDate, setRecordsDate] = useState(now.date)
  // Загрузка дольше обычного — подсказываем про сеть, а не молча крутим «Загрузка…»
  const [slowBoot, setSlowBoot] = useState(false)

  useEffect(() => {
    applyTheme()
  }, [])

  useEffect(() => {
    if (store.ready || store.authError) {
      setSlowBoot(false)
      return undefined
    }
    const id = setTimeout(() => setSlowBoot(true), 8000)
    return () => clearTimeout(id)
  }, [store.ready, store.authError])

  // Ошибки фоновых запросов (reportError в useStore) — тем же тостом
  useEffect(() => {
    const onApiError = (e: Event) => setToast((e as CustomEvent<string>).detail)
    window.addEventListener('api-error', onApiError)
    return () => window.removeEventListener('api-error', onApiError)
  }, [])

  // Новый экран открывается с начала, а не с позиции прокрутки прошлого
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  // Аппаратная «назад» в Telegram — на всех экранах кроме вкладок
  const onTab = isTab(view)
  useEffect(() => {
    const bb = tg?.BackButton
    if (!bb) return undefined
    if (onTab) {
      bb.hide()
      return undefined
    }
    const goBack = () => setView((current) => backTarget(current))
    bb.onClick(goBack)
    bb.show()
    return () => {
      bb.offClick(goBack)
      bb.hide()
    }
  }, [onTab])

  const hideToast = useCallback(() => setToast(''), [])
  const closeStories = useCallback(() => setStories(false), [])
  const clientById = useMemo(() => indexById(store.clients), [store.clients])
  // Значение контекста — одним объектом, пересобирается только при смене профиля
  const masterContext = useMemo(
    () =>
      store.master
        ? { master: store.master, wording: wordingFor(store.master.specialties, store.specialties) }
        : null,
    [store.master, store.specialties]
  )

  if (store.authError) {
    return (
      <AppShell>
        <EmptyState action={<Button variant="dark" size="sm" onClick={store.retryBoot}>Повторить</Button>}>
          Не удалось подключиться. {store.authError}
        </EmptyState>
      </AppShell>
    )
  }

  if (!store.ready) {
    return (
      <AppShell>
        <EmptyState>
          Загрузка…
          {slowBoot ? ' Долго грузится — проверьте интернет; если включён VPN, попробуйте его выключить.' : null}
        </EmptyState>
      </AppShell>
    )
  }

  // Первый вход: знакомство вместо вкладок, пока мастер его не пройдёт
  if (store.master && (!store.master.onboarded || welcome)) {
    return (
      <AppShell>
        <OnboardingPage
          catalog={store.specialties}
          telegramName={store.master.telegramName}
          onSubmit={(input) => {
            setWelcome(true)
            return store.completeOnboarding(input).catch((e: unknown) => {
              setWelcome(false)
              throw e
            })
          }}
          onFinish={() => {
            haptic('medium')
            setWelcome(false)
            setView({ name: 'today' })
          }}
        />
        <Toast message={toast} onHide={hideToast} />
      </AppShell>
    )
  }

  const masterName = store.master?.name ?? telegramFirstName() ?? 'мастер'
  const workday = store.master?.workday ?? DEFAULT_WORKDAY
  // Подпись на сторис: «Вика · ногти». Направлений больше двух — без перечисления
  const specialtyTitles = store.specialties.filter((sp) => store.master?.specialties.includes(sp.id)).map((sp) => sp.label)
  const specialtyLabels = specialtyTitles.map((label) => label.toLowerCase())
  // Под именем в онлайн-записи: что входит и где — «Маникюр, гель-лак, наращивание · Таганская, 24»
  const summary = store.specialties.find((sp) => sp.id === store.master?.specialties[0])?.summary ?? ''
  const bookingSubtitle = [summary.charAt(0).toUpperCase() + summary.slice(1), store.master?.address].filter(Boolean).join(' · ')
  const storyName =
    specialtyLabels.length && specialtyLabels.length <= 2
      ? `${masterName} · ${specialtyLabels.join(', ')}`
      : `${masterName} · бьюти-мастер`

  const open = (next: View) => setView((current) => openView(current, next))
  const goBack = () => setView((current) => backTarget(current))
  const openClient = (id: string) => open({ name: 'client', id })
  const book = (initial: BookingInitial = {}) => open({ name: 'book', initial })

  const write = (client: Client) => {
    if (!openChat(client.username)) {
      setToast(
        client.inviteStatus === 'accepted'
          ? 'У клиентки скрыт username в Telegram — написать из приложения не получится'
          : 'Клиентка ещё не подключена к боту — пригласите её из карточки'
      )
    }
  }

  const invite = (client: Client) => {
    store
      .inviteClient(client.id)
      .then(shareText)
      .then((result) => {
        if (result === 'copied') setToast('Приглашение скопировано — отправьте его клиентке')
        else if (result === 'failed') setToast('Не удалось открыть отправку — попробуйте ещё раз')
      })
      .catch((e: Error) => setToast(e.message))
  }

  const handleSave = (draft: BookingResult, replaceId?: string) => {
    if (replaceId) store.rescheduleAppointment(replaceId, draft)
    else store.addAppointment(draft)
    haptic('medium')
    setRecordsDate(draft.date)
    goBack()
    const client = clientById.get(draft.clientId)
    setToast(
      replaceId
        ? `Перенесла на ${dayMonth(draft.date)}, ${draft.start}`
        : draft.remind && client?.inviteStatus === 'accepted'
          ? 'Записала. Бот напомнит клиентке заранее'
          : 'Записала'
    )
  }

  const saveClient = async (form: ClientForm, then?: BookingInitial) => {
    const created = await store.addClient(form)
    haptic('medium')
    // Из шторки записи — обратно в запись, уже с ней; иначе — в её карточку
    setView((current) => ({
      ...(then ? { name: 'book' as const, initial: { ...then, clientId: created.id } } : { name: 'client' as const, id: created.id }),
      prev: current.prev,
    }))
  }

  const client = view.name === 'client' ? clientById.get(view.id) : undefined

  const screens = (
    <AppShell>
      {view.name === 'today' ? (
        <TodayPage
          masterName={masterName}
          clientById={clientById}
          appointments={store.appointments}
          now={now}
          onOpenClient={openClient}
          onOpenProfile={() => open({ name: 'profile' })}
          onOpenRecords={() => {
            setRecordsDate(now.date)
            setView({ name: 'records' })
          }}
          onArrived={(a) => {
            haptic()
            store.setStatus(a.id, 'arrived')
          }}
          onDone={(a) => {
            haptic('medium')
            // «Готово · 3 500 ₽» — визит проведён и оплачен полностью
            store.setStatus(a.id, 'done', a.price)
            setToast('Готово, визит записан в историю')
          }}
          onWrite={write}
          onBook={book}
        />
      ) : null}

      {view.name === 'records' ? (
        <RecordsPage
          clientById={clientById}
          appointments={store.appointments}
          now={now}
          workday={workday}
          edits={store.windowEdits}
          onLoadEdits={store.loadWindowEdits}
          date={recordsDate}
          onSelectDate={setRecordsDate}
          onOpenClient={openClient}
          onBook={book}
          onStories={() => setStories(true)}
        />
      ) : null}

      {stories && view.name === 'records' ? (
        <StorySheet
          appointments={store.appointments}
          workday={workday}
          now={now}
          edits={store.windowEdits}
          name={storyName}
          username={store.master?.instagram ?? store.master?.username ?? null}
          onClose={closeStories}
          onShared={(result: ShareResult) => {
            setStories(false)
            if (result === 'downloaded') setToast('Картинка сохранена — выложите её в сторис')
          }}
          onError={setToast}
          onOpenMonth={() => {
            setStories(false)
            open({ name: 'monthWindows', month: monthStart(now.date) })
          }}
        />
      ) : null}

      {view.name === 'monthWindows' ? (
        <MonthWindowsPage
          appointments={store.appointments}
          workday={workday}
          now={now}
          edits={store.windowEdits}
          month={view.month}
          canPrev={view.month > monthStart(now.date)}
          canNext={view.month < monthStart(now.date, MONTHS_AHEAD)}
          onMonth={(step) =>
            setView((current) => (current.name === 'monthWindows' ? { ...current, month: monthStart(current.month, step) } : current))
          }
          onLoadEdits={store.loadWindowEdits}
          onSaveEdits={store.saveWindowEdits}
          name={storyName}
          onCreate={() => open({ name: 'monthStories', month: view.month })}
          onBack={goBack}
        />
      ) : null}

      {view.name === 'monthStories' ? (
        <MonthStoriesPage
          appointments={store.appointments}
          workday={workday}
          now={now}
          edits={store.windowEdits}
          month={view.month}
          name={storyName}
          username={store.master?.instagram ?? store.master?.username ?? null}
          onShared={(result, left) => {
            if (result === 'downloaded') setToast(left ? `Картинка сохранена, осталось ${left}` : 'Все картинки сохранены — выложите их в сторис')
            else if (!left) setToast('Серия готова')
          }}
          onError={setToast}
          onBack={goBack}
        />
      ) : null}

      {view.name === 'clients' ? (
        <ClientsPage
          clients={store.clients}
          appointments={store.appointments}
          now={now}
          onOpen={openClient}
          onBook={book}
          onAdd={() => open({ name: 'addClient' })}
        />
      ) : null}

      {view.name === 'money' ? (
        <MoneyPage
          appointments={store.appointments}
          clientById={clientById}
          now={now}
          // Отдельной рассылки о долге пока нет — открываем чат с клиенткой
          onRemind={(d) => d.client && write(d.client)}
          onOpenDay={(date) => {
            setRecordsDate(date)
            setView({ name: 'records' })
          }}
        />
      ) : null}

      {client ? (
        <ClientPage
          client={client}
          appointments={store.appointments}
          now={now}
          onBack={goBack}
          onBook={book}
          onReschedule={(a) =>
            book({
              clientId: a.clientId,
              serviceIds: a.services.map((s) => s.id),
              date: a.date,
              minutes: a.minutes,
              note: a.note,
              replaceId: a.id,
            })
          }
          onWrite={write}
          onInvite={invite}
          onAddPhoto={store.addPhoto}
        />
      ) : null}

      {view.name === 'book' ? (
        <NewAppointmentPage
          services={store.services}
          workday={workday}
          clients={store.clients}
          appointments={store.appointments}
          now={now}
          initial={view.initial}
          onSave={handleSave}
          onAddClient={(state) => open({ name: 'addClient', then: state })}
          onCancel={goBack}
        />
      ) : null}

      {view.name === 'addClient' ? (
        <AddClientPage catalog={store.specialties} onSave={(form) => saveClient(form, view.then)} onCancel={goBack} />
      ) : null}

      {view.name === 'profile' ? (
        <ProfilePage
          catalog={store.specialties}
          servicesCount={store.services.length}
          hiddenCount={store.services.filter((svc) => !svc.online).length}
          onSave={(patch) => store.updateMaster(patch).then(() => setToast('Сохранено'))}
          onOpenServices={() => open({ name: 'services' })}
          onOpenBooking={() => open({ name: 'bookingPreview' })}
          onBack={goBack}
        />
      ) : null}

      {view.name === 'services' ? (
        <ServicesPage
          services={store.services}
          catalog={store.specialties}
          onAdd={store.addService}
          onUpdate={store.updateService}
          onRemove={store.removeService}
          onBack={goBack}
        />
      ) : null}

      {view.name === 'bookingPreview' ? (
        <BookingPreviewPage
          title={storyName}
          subtitle={bookingSubtitle}
          address={store.master?.address ?? null}
          services={store.services}
          appointments={store.appointments}
          workday={workday}
          now={now}
          edits={store.windowEdits}
          onLoadEdits={store.loadWindowEdits}
          onBack={goBack}
        />
      ) : null}

      {/* Нижнее меню — только на вкладках: на вложенных экранах там панель действий */}
      {isTab(view) ? <TabBar items={TABS} value={view.name} onChange={(name) => setView({ name })} /> : null}

      <Toast message={toast} onHide={hideToast} />
    </AppShell>
  )

  return masterContext ? <MasterProvider value={masterContext}>{screens}</MasterProvider> : screens
}

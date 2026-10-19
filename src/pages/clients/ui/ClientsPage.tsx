import { useDeferredValue, useMemo, useState } from 'react'
import type { Appointment } from '../../../entities/appointment'
import {
  appointmentsOf,
  clientHint,
  clientStats,
  ClientRow,
  groupByClient,
  type Client,
  type ClientStats,
} from '../../../entities/client'
import { useMaster } from '../../../entities/master'
import type { BookingInitial } from '../../../features/add-appointment'
import type { Now } from '../../../shared/lib/useNow'
import { Button, EmptyState, IconButton, Panel, Screen, SectionHeader, Stack, Title } from '../../../shared/ui'
import s from './ClientsPage.module.css'

interface Row {
  client: Client
  stats: ClientStats
}

interface ClientsPageProps {
  clients: readonly Client[]
  appointments: readonly Appointment[]
  now: Now
  onOpen: (id: string) => void
  onBook: (initial: BookingInitial) => void
  onAdd: () => void
}

// «Клиенты»: поиск, сверху те, кого пора звать на коррекцию, ниже все по алфавиту
export default function ClientsPage({ clients, appointments, now, onOpen, onBook, onAdd }: ClientsPageProps) {
  const { wording } = useMaster()
  const [query, setQuery] = useState('')
  // Поле ввода обновляется сразу, а фильтр списка — когда браузер освободится
  const deferredQuery = useDeferredValue(query)

  const rows = useMemo(() => {
    const groups = groupByClient(appointments)
    const collator = new Intl.Collator('ru')
    return clients
      .map((client) => ({ client, stats: clientStats(client, appointmentsOf(groups, client.id), now) }))
      .sort((a, b) => collator.compare(a.client.name, b.client.name))
  }, [clients, appointments, now])

  const q = deferredQuery.trim().toLowerCase()
  const found = q ? rows.filter((r) => r.client.name.toLowerCase().includes(q)) : rows
  const due = q ? [] : rows.filter((r) => r.stats.due)

  const renderRow = ({ client, stats }: Row, withAction = false) => (
    <ClientRow
      key={client.id}
      client={client}
      hint={clientHint(stats, now.date, wording.correction)}
      accent={stats.due}
      onClick={() => onOpen(client.id)}
      aside={
        withAction ? (
          <Button
            variant="soft"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              onBook({ clientId: client.id, serviceIds: stats.lastServiceIds })
            }}
          >
            Записать
          </Button>
        ) : null
      }
    />
  )

  return (
    <Screen>
      <header className={s.header}>
        <Title>
          Клиенты <span className={s.count}>{clients.length}</span>
        </Title>
        <IconButton label="Новая клиентка" variant="dark" onClick={onAdd}>+</IconButton>
      </header>

      <input
        className={s.search}
        type="search"
        placeholder="Найти по имени"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {due.length ? (
        <Stack gap={10}>
          <SectionHeader title="Пора записать" />
          <Panel list>{due.map((r) => renderRow(r, true))}</Panel>
        </Stack>
      ) : null}

      <Stack gap={10}>
        {q ? null : <SectionHeader title="Все" />}
        {found.length ? (
          <Panel list>{found.map((r) => renderRow(r))}</Panel>
        ) : q ? (
          <EmptyState>Никого не нашли</EmptyState>
        ) : (
          <EmptyState action={<Button variant="dark" size="sm" onClick={onAdd}>Добавить клиентку</Button>}>
            Здесь будут ваши клиентки — с историей визитов и фото работ
          </EmptyState>
        )}
      </Stack>
    </Screen>
  )
}

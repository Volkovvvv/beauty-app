import { useDeferredValue, useMemo, useState } from 'react'
import type { Appointment } from '../../../entities/appointment'
import { appointmentsOf, clientHint, clientStats, ClientRow, groupByClient, type Client } from '../../../entities/client'
import { useMaster } from '../../../entities/master'
import type { Now } from '../../../shared/lib/useNow'
import { Button, Panel, Sheet } from '../../../shared/ui'
import s from './NewAppointmentPage.module.css'

interface ClientPickerProps {
  clients: readonly Client[]
  appointments: readonly Appointment[]
  now: Now
  onPick: (client: Client, lastServiceIds: string[]) => void
  onAddClient: () => void
  onClose: () => void
}

// Шторка выбора клиентки. История считается один раз при открытии,
// а не на каждую набранную в поиске букву
export default function ClientPicker({ clients, appointments, now, onPick, onAddClient, onClose }: ClientPickerProps) {
  const { wording } = useMaster()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const rows = useMemo(() => {
    const groups = groupByClient(appointments)
    return clients.map((client) => ({ client, stats: clientStats(client, appointmentsOf(groups, client.id), now) }))
  }, [clients, appointments, now])

  const q = deferredQuery.trim().toLowerCase()
  const found = q ? rows.filter((r) => r.client.name.toLowerCase().includes(q)) : rows

  return (
    <Sheet title="Кого записать" onClose={onClose}>
      <input
        className={s.search}
        type="search"
        placeholder="Найти по имени"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <Button variant="dark" onClick={onAddClient}>
        + Новая клиентка
      </Button>
      <Panel list>
        {found.map(({ client, stats }) => (
          <ClientRow
            key={client.id}
            client={client}
            hint={clientHint(stats, now.date, wording.correction)}
            accent={stats.due}
            onClick={() => onPick(client, stats.lastServiceIds)}
          />
        ))}
      </Panel>
    </Sheet>
  )
}

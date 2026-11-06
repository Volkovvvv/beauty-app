import { useMemo } from 'react'
import type { Appointment } from '../../../entities/appointment'
import { clientStats, firstName, initials, visitsLabel, type Client, type ClientCard } from '../../../entities/client'
import { useMaster } from '../../../entities/master'
import type { BookingInitial } from '../../../features/add-appointment'
import { dayMonth, MONTHS_GEN, monthIndex } from '../../../shared/lib/date'
import { plural, rub } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { Avatar, BottomBar, Button, IconButton, Panel, Screen, SectionHeader, Stack, TextAction, Title } from '../../../shared/ui'
import s from './ClientPage.module.css'

const CARD_FIELDS: ReadonlyArray<[keyof ClientCard, string]> = [['payment', 'Оплата']]

const everyWeeks = (n: number) => (n === 1 ? 'Каждую неделю' : `Каждые ${n} ${plural(n, ['неделю', 'недели', 'недель'])}`)

interface ClientPageProps {
  client: Client
  appointments: readonly Appointment[]
  now: Now
  onBack: () => void
  onBook: (initial: BookingInitial) => void
  onReschedule: (appointment: Appointment) => void
  onWrite: (client: Client) => void
  onInvite: (client: Client) => void
  onEdit: (client: Client) => void
}

// Карточка клиентки: ближайшая запись, фото работ и заметки мастера
export default function ClientPage({ client, appointments, now, onBack, onBook, onReschedule, onWrite, onInvite, onEdit }: ClientPageProps) {
  const { wording } = useMaster()
  const stats = useMemo(
    () => clientStats(client, appointments.filter((a) => a.clientId === client.id), now),
    [client, appointments, now]
  )

  const history =
    stats.visits && stats.since
      ? `Ходит с ${MONTHS_GEN[monthIndex(stats.since)]} · ${visitsLabel(stats.visits)} · ${rub(stats.total)}`
      : 'Новая клиентка'

  const rebook = () => onBook({ clientId: client.id, serviceIds: stats.lastServiceIds })

  return (
    <>
      <Screen>
        <div className={s.top}>
          <IconButton label="Назад" onClick={onBack}>‹</IconButton>
          <TextAction onClick={() => onEdit(client)}>Изменить</TextAction>
        </div>

        <div className={s.hero}>
          <Avatar text={initials(client.name, 1)} size="lg" />
          <Title className={s.name}>{client.name}</Title>
          <span className={s.history}>{history}</span>
        </div>

        {stats.next ? (
          <Panel>
            <div className={s.next}>
              <span className={s.nextLabel}>Следующая запись</span>
              <span className={s.nextWhen}>
                {dayMonth(stats.next.date)}, {stats.next.start}
              </span>
              <span className={s.nextHint}>{everyWeeks(client.repeatWeeks)} · бот напомнит за день</span>
            </div>
            <Button variant="soft" size="sm" onClick={() => stats.next && onReschedule(stats.next)}>
              Изменить
            </Button>
          </Panel>
        ) : stats.suggestedDate ? (
          <Panel>
            <div className={s.next}>
              <span className={s.nextLabel}>
                {wording.correction
                  ? stats.due
                    ? 'Пора на коррекцию'
                    : 'Следующая коррекция'
                  : stats.due
                    ? 'Пора записаться снова'
                    : 'Следующий визит'}
              </span>
              <span className={s.nextWhen}>примерно {dayMonth(stats.suggestedDate)}</span>
              <span className={s.nextHint}>{everyWeeks(client.repeatWeeks)} · пока не записана</span>
            </div>
            <Button variant="soft" size="sm" onClick={rebook}>
              Записать
            </Button>
          </Panel>
        ) : null}

        {client.inviteStatus !== 'accepted' ? (
          <Panel>
            <div className={s.next}>
              <span className={s.nextLabel}>
                {client.inviteStatus === 'invited' ? 'Ссылка отправлена' : 'Не подключена к боту'}
              </span>
              <span className={s.nextHint}>
                {client.inviteStatus === 'invited'
                  ? `Как только ${firstName(client)} нажмёт «Начать», бот начнёт напоминать о записи`
                  : `Бот не сможет напомнить о записи и позвать ${wording.correction ? 'на коррекцию' : 'снова'}`}
              </span>
            </div>
            <Button variant="soft" size="sm" onClick={() => onInvite(client)}>
              {client.inviteStatus === 'invited' ? 'Ещё раз' : 'Пригласить'}
            </Button>
          </Panel>
        ) : null}

        <Stack gap={10}>
          <SectionHeader title="Карточка" />
          <Panel list>
            {CARD_FIELDS.map(([key, label]) =>
              client.card[key] ? (
                <div key={key} className={s.field}>
                  <span className={s.fieldKey}>{label}</span>
                  <span className={s.fieldValue}>{client.card[key]}</span>
                </div>
              ) : null
            )}
          </Panel>
        </Stack>
      </Screen>

      <BottomBar>
        <Button size="lg" wide onClick={rebook}>Записать снова</Button>
        <Button variant="glass" size="lg" onClick={() => onWrite(client)}>Написать</Button>
      </BottomBar>
    </>
  )
}

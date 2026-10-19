import { useMemo, useRef, type ChangeEvent } from 'react'
import type { Appointment } from '../../../entities/appointment'
import { clientStats, firstName, initials, visitsLabel, WorkPhotoTile, type Client, type ClientCard } from '../../../entities/client'
import { useMaster } from '../../../entities/master'
import type { BookingInitial } from '../../../features/add-appointment'
import { dayMonth, MONTHS_GEN, monthIndex } from '../../../shared/lib/date'
import { plural, rub } from '../../../shared/lib/format'
import type { Now } from '../../../shared/lib/useNow'
import { Avatar, BottomBar, Button, EmptyState, IconButton, Panel, Screen, SectionHeader, Stack, TextAction, Title } from '../../../shared/ui'
import s from './ClientPage.module.css'

// Подпись первого поля зависит от направления мастера — её подставит экран
const CARD_FIELDS: ReadonlyArray<[keyof ClientCard, string | null]> = [
  ['shape', null],
  ['likes', 'Любит'],
  ['allergy', 'Аллергия'],
  ['payment', 'Оплата'],
]

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
  onAddPhoto: (clientId: string, file: File) => void
}

// Карточка клиентки: ближайшая запись, фото работ и заметки мастера
export default function ClientPage({ client, appointments, now, onBack, onBook, onReschedule, onWrite, onInvite, onAddPhoto }: ClientPageProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const { wording } = useMaster()
  const stats = useMemo(
    () => clientStats(client, appointments.filter((a) => a.clientId === client.id), now),
    [client, appointments, now]
  )

  const history =
    stats.visits && stats.since
      ? `Ходит с ${MONTHS_GEN[monthIndex(stats.since)]} · ${visitsLabel(stats.visits)} · ${rub(stats.total)}`
      : 'Новая клиентка'

  const addPhoto = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onAddPhoto(client.id, file)
  }

  const rebook = () => onBook({ clientId: client.id, serviceIds: stats.lastServiceIds })

  return (
    <>
      <Screen>
        <div className={s.top}>
          <IconButton label="Назад" onClick={onBack}>‹</IconButton>
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
          <SectionHeader title="Работы" aside={<TextAction onClick={() => fileRef.current?.click()}>+ Фото</TextAction>} />
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={addPhoto} />
          {client.photos.length ? (
            <div className={s.photos}>
              {client.photos.map((p) => (
                <WorkPhotoTile key={p.id} clientId={client.id} photo={p} />
              ))}
            </div>
          ) : (
            <EmptyState>Сюда попадут фото работ — удобно повторить, что понравилось</EmptyState>
          )}
        </Stack>

        <Stack gap={10}>
          <SectionHeader title="Карточка" />
          <Panel list>
            {CARD_FIELDS.map(([key, label]) =>
              client.card[key] ? (
                <div key={key} className={s.field}>
                  <span className={s.fieldKey}>{label ?? wording.cardLabel}</span>
                  <span className={key === 'allergy' ? s.fieldAlert : s.fieldValue}>{client.card[key]}</span>
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

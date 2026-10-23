import { useState } from 'react'
import { useMaster, type Specialty } from '../../../entities/master'
import { SpecialtyPicker } from '../../../features/onboarding'
import { cx } from '../../../shared/lib/cx'
import { fromMinutes, WEEKDAYS } from '../../../shared/lib/date'
import { count } from '../../../shared/lib/format'
import { INSTAGRAM_ERROR, instagramHandle } from '../../../shared/lib/instagram'
import { Avatar, BottomBar, Button, IconButton, Panel, Screen, Stack, TextField, Title } from '../../../shared/ui'
import { initials } from '../../../entities/client'
import s from './ProfilePage.module.css'

interface ProfilePageProps {
  catalog: readonly Specialty[]
  servicesCount: number
  /** Сколько услуг скрыто из онлайн-записи */
  hiddenCount: number
  onSave: (patch: { displayName: string; address: string; instagram: string; specialties: string[]; workDays: number[] }) => Promise<void>
  onOpenServices: () => void
  onOpenBooking: () => void
  onBack: () => void
}

const same = <T,>(a: readonly T[], b: readonly T[]) => a.length === b.length && a.every((x, i) => x === b[i])

// Профиль мастера: имя, адрес и Instagram для клиенток, сферы, рабочие дни и услуги
export default function ProfilePage({ catalog, servicesCount, hiddenCount, onSave, onOpenServices, onOpenBooking, onBack }: ProfilePageProps) {
  const { master } = useMaster()
  const [name, setName] = useState(master.name)
  const [address, setAddress] = useState(master.address ?? '')
  const [instagram, setInstagram] = useState(master.instagram ? `@${master.instagram}` : '')
  const [picked, setPicked] = useState(master.specialties)
  const [workDays, setWorkDays] = useState<readonly number[]>(master.workday.days)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handle = instagramHandle(instagram)
  const changed =
    name.trim() !== master.name ||
    address.trim() !== (master.address ?? '') ||
    (handle ?? instagram) !== (master.instagram ?? '') ||
    !same(picked, master.specialties) ||
    !same(workDays, master.workday.days)
  const ready = changed && name.trim().length > 0 && picked.length > 0 && handle !== null && !saving

  const toggleDay = (day: number) =>
    setWorkDays((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort((a, b) => a - b)))

  const save = () => {
    if (!ready) return
    setSaving(true)
    setError('')
    onSave({ displayName: name.trim(), address: address.trim(), instagram: handle ?? '', specialties: picked, workDays: [...workDays] })
      .catch((e: Error) => setError(e.message))
      .finally(() => setSaving(false))
  }

  return (
    <>
      <Screen>
        <div className={s.top}>
          <IconButton label="Назад" onClick={onBack}>‹</IconButton>
        </div>

        <div className={s.hero}>
          <Avatar text={initials(master.name, 1)} size="lg" />
          <Title>{master.name}</Title>
          <span className={s.sub}>
            Рабочий день {fromMinutes(master.workday.start)}–{fromMinutes(master.workday.end)}
          </span>
        </div>

        <TextField label="Как вас зовут клиентки" value={name} onChange={setName} maxLength={100} />
        <TextField label="Где принимаете" value={address} onChange={setAddress} placeholder="Улица, дом, студия" maxLength={200} />
        <TextField
          label="Instagram"
          value={instagram}
          onChange={setInstagram}
          placeholder="@username"
          maxLength={100}
          invalid={handle === null}
          hint={handle === null ? INSTAGRAM_ERROR : 'Ссылка в онлайн-записи и подпись в сторис'}
        />

        <Stack gap={10}>
          <span className={s.label}>Сферы</span>
          <SpecialtyPicker catalog={catalog} value={picked} onChange={setPicked} />
          <span className={s.sub}>Первая — основная: от неё обычный интервал между визитами новых клиенток. Услуги от выбора не меняются</span>
        </Stack>

        <Stack gap={10}>
          <span className={s.label}>Рабочие дни</span>
          <div className={s.days}>
            {WEEKDAYS.map((label, day) => (
              <button
                key={label}
                type="button"
                aria-pressed={workDays.includes(day)}
                className={cx(s.dayChip, workDays.includes(day) && s.dayOn)}
                onClick={() => toggleDay(day)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className={s.sub}>
            {workDays.length
              ? 'В выходные нет слотов записи и окошек для сторис — записать клиентку можно на своё время'
              : 'Ни одного рабочего дня — окошки для сторис можно добавить только вручную'}
          </span>
        </Stack>

        <Panel list>
          <button type="button" className={s.row} onClick={onOpenServices}>
            <span className={s.rowText}>
              <span className={s.rowTitle}>Мои услуги</span>
              <span className={s.sub}>
                {count(servicesCount, ['услуга', 'услуги', 'услуг'])}
                {hiddenCount ? ` · ${hiddenCount} скрыто из онлайн-записи` : ''}
              </span>
            </span>
            <span className={s.chevron} aria-hidden="true">›</span>
          </button>
          <button type="button" className={s.row} onClick={onOpenBooking}>
            <span className={s.rowText}>
              <span className={s.rowTitle}>Онлайн-запись</span>
              <span className={s.sub}>Посмотреть, как её видят клиентки</span>
            </span>
            <span className={s.chevron} aria-hidden="true">›</span>
          </button>
        </Panel>

        {error ? <span className={s.error}>{error}</span> : null}
      </Screen>

      {changed ? (
        <BottomBar>
          <Button size="lg" wide disabled={!ready} onClick={save}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </Button>
        </BottomBar>
      ) : null}
    </>
  )
}

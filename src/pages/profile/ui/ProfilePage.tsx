import { useState } from 'react'
import { useMaster, type Specialty } from '../../../entities/master'
import { SpecialtyPicker } from '../../../features/onboarding'
import { fromMinutes } from '../../../shared/lib/date'
import { count } from '../../../shared/lib/format'
import { Avatar, BottomBar, Button, IconButton, Panel, Screen, Stack, TextField, Title } from '../../../shared/ui'
import { initials } from '../../../entities/client'
import s from './ProfilePage.module.css'

interface ProfilePageProps {
  catalog: readonly Specialty[]
  servicesCount: number
  onSave: (patch: { displayName: string; specialties: string[] }) => Promise<void>
  onOpenPrices: () => void
  onBack: () => void
}

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i])

// Профиль мастера: имя для клиенток, направления и прайс
export default function ProfilePage({ catalog, servicesCount, onSave, onOpenPrices, onBack }: ProfilePageProps) {
  const { master } = useMaster()
  const [name, setName] = useState(master.name)
  const [picked, setPicked] = useState(master.specialties)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const changed = name.trim() !== master.name || !same(picked, master.specialties)
  const ready = changed && name.trim().length > 0 && picked.length > 0 && !saving
  const added = picked.filter((id) => !master.specialties.includes(id))

  const save = () => {
    if (!ready) return
    setSaving(true)
    setError('')
    onSave({ displayName: name.trim(), specialties: picked })
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

        <Stack gap={10}>
          <span className={s.label}>Направления</span>
          <SpecialtyPicker catalog={catalog} value={picked} onChange={setPicked} />
          <span className={s.sub}>
            {added.length
              ? 'Новое направление добавит в прайс свои услуги — их можно поправить или убрать'
              : 'Первое выбранное — основное: от него обычный интервал между визитами новых клиенток'}
          </span>
        </Stack>

        <Panel list>
          <button type="button" className={s.row} onClick={onOpenPrices}>
            <span className={s.rowText}>
              <span className={s.rowTitle}>Прайс</span>
              <span className={s.sub}>{count(servicesCount, ['услуга', 'услуги', 'услуг'])}</span>
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

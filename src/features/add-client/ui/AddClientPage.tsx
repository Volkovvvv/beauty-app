import { useState } from 'react'
import { useMaster, type Specialty } from '../../../entities/master'
import { plural } from '../../../shared/lib/format'
import { BottomBar, Button, IconButton, Screen, StepperField, TextField, Title } from '../../../shared/ui'
import s from './AddClientPage.module.css'

export interface ClientForm {
  name: string
  shape?: string
  likes?: string
  allergy?: string
  payment?: string
  repeatWeeks: number
}

interface AddClientPageProps {
  catalog: readonly Specialty[]
  onSave: (form: ClientForm) => Promise<void>
  onCancel: () => void
}

const weeks = (n: number) => `раз в ${n === 1 ? 'неделю' : `${n} ${plural(n, ['неделю', 'недели', 'недель'])}`}`

// Новая клиентка: имя обязательно, остальное — если мастер знает сразу
export default function AddClientPage({ catalog, onSave, onCancel }: AddClientPageProps) {
  const { master, wording } = useMaster()
  // Интервал по умолчанию — обычный для основного направления мастера
  const usual = catalog.find((sp) => sp.id === master.specialties[0])?.repeatWeeks ?? 4
  const [form, setForm] = useState<ClientForm>({ name: '', repeatWeeks: usual })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = <K extends keyof ClientForm>(key: K) => (value: ClientForm[K]) => setForm((f) => ({ ...f, [key]: value }))
  const ready = form.name.trim().length > 0 && !saving

  const submit = () => {
    if (!ready) return
    setSaving(true)
    setError('')
    const trim = (v?: string) => v?.trim() || undefined
    onSave({
      name: form.name.trim(),
      shape: trim(form.shape),
      likes: trim(form.likes),
      allergy: trim(form.allergy),
      payment: trim(form.payment),
      repeatWeeks: form.repeatWeeks,
    }).catch((e: Error) => {
      setError(e.message)
      setSaving(false)
    })
  }

  return (
    <>
      <Screen>
        <div className={s.header}>
          <IconButton label="Назад" variant="white" onClick={onCancel}>‹</IconButton>
          <Title size="lg">Новая клиентка</Title>
        </div>

        <TextField label="Имя" value={form.name} onChange={set('name')} placeholder="Алина Морозова" maxLength={100} autoFocus />
        <TextField label={wording.cardLabel} value={form.shape ?? ''} onChange={set('shape')} maxLength={100} />
        <TextField label="Что любит" value={form.likes ?? ''} onChange={set('likes')} />
        <TextField
          label="Аллергия и противопоказания"
          value={form.allergy ?? ''}
          onChange={set('allergy')}
          hint="Покажем на карточке записи красным — перед визитом не забудете"
        />
        <TextField label="Оплата" value={form.payment ?? ''} onChange={set('payment')} placeholder="Перевод, наличные" maxLength={100} />
        <StepperField
          label="Обычно приходит"
          value={form.repeatWeeks}
          onChange={set('repeatWeeks')}
          step={1}
          min={1}
          max={26}
          format={weeks}
        />

        {error ? <span className={s.error}>{error}</span> : null}
      </Screen>

      <BottomBar>
        <Button size="lg" wide disabled={!ready} onClick={submit}>
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </BottomBar>
    </>
  )
}

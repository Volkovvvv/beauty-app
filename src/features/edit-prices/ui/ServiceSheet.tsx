import { useState } from 'react'
import { useMaster, type Specialty } from '../../../entities/master'
import type { Service } from '../../../entities/service'
import { cx } from '../../../shared/lib/cx'
import { duration } from '../../../shared/lib/format'
import { Button, PriceInput, Sheet, Stepper, TextField, ToggleRow } from '../../../shared/ui'
import s from './ServicesPage.module.css'

type Draft = Omit<Service, 'id'>

interface ServiceSheetProps {
  /** null — новая услуга */
  service: Service | null
  catalog: readonly Specialty[]
  onSave: (draft: Draft) => void
  onRemove?: () => void
  onClose: () => void
}

// Пределы — как у API: короче 10 минут услугу не ставят, дольше 10 часов не бывает
const MIN_MINUTES = 10
const MAX_MINUTES = 600

// Услуга: название, раздел, длительность, цена и видна ли в онлайн-записи
export default function ServiceSheet({ service, catalog, onSave, onRemove, onClose }: ServiceSheetProps) {
  const { master } = useMaster()
  const [draft, setDraft] = useState<Draft>(() =>
    service
      ? { name: service.name, minutes: service.minutes, price: service.price, category: service.category, online: service.online }
      : { name: '', minutes: 60, price: 0, category: master.specialties[0] ?? 'other', online: true }
  )
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const ready = draft.name.trim().length > 0 && draft.price > 0

  // Разделы — сферы мастера; раздел самой услуги показываем, даже если сферу убрали
  const sections = catalog.filter((c) => master.specialties.includes(c.id) || c.id === draft.category)

  return (
    <Sheet title={service ? 'Услуга' : 'Новая услуга'} onClose={onClose}>
      <TextField
        label="Название"
        value={draft.name}
        onChange={set('name')}
        placeholder="Название услуги"
        maxLength={60}
        autoFocus={!service}
      />

      {sections.length > 1 ? (
        <div className={s.field}>
          <span className={s.fieldLabel}>Раздел</span>
          <div className={s.sections}>
            {sections.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={draft.category === c.id}
                className={cx(s.section, draft.category === c.id && s.sectionOn)}
                onClick={() => set('category')(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className={s.pair}>
        <div className={s.field}>
          <span className={s.fieldLabel}>Длительность</span>
          <div className={s.stepperBox}>
            <Stepper
              label="Длительность"
              value={draft.minutes}
              onChange={set('minutes')}
              step={10}
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              format={duration}
            />
          </div>
        </div>
        <div className={s.field}>
          <span className={s.fieldLabel}>Цена</span>
          <PriceInput label="Цена" value={draft.price} onChange={set('price')} />
        </div>
      </div>

      <ToggleRow
        title="Показывать в онлайн-записи"
        hint={draft.online ? undefined : 'Клиентки её не увидят — записать можно самой'}
        checked={draft.online}
        onChange={set('online')}
      />

      <div className={s.actions}>
        {onRemove ? (
          <button type="button" className={s.remove} onClick={onRemove}>
            Удалить
          </button>
        ) : null}
        <Button variant="dark" size="lg" wide disabled={!ready} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>
          {draft.name.trim() && !draft.price ? 'Укажите цену' : 'Готово'}
        </Button>
      </div>
    </Sheet>
  )
}

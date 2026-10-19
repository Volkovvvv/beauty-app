import { useState } from 'react'
import type { Service } from '../../../entities/service'
import { duration, rub } from '../../../shared/lib/format'
import { Button, Sheet, StepperField, TextField } from '../../../shared/ui'
import s from './PricesPage.module.css'

type Draft = Omit<Service, 'id'>

interface ServiceSheetProps {
  /** null — новая услуга */
  service: Service | null
  onSave: (draft: Draft) => void
  onRemove?: () => void
  onClose: () => void
}

const EMPTY: Draft = { name: '', minutes: 60, price: 1500, cost: 150 }

// Услуга прайса: название, длительность, цена, расход материалов
export default function ServiceSheet({ service, onSave, onRemove, onClose }: ServiceSheetProps) {
  const [draft, setDraft] = useState<Draft>(() =>
    service ? { name: service.name, minutes: service.minutes, price: service.price, cost: service.cost } : EMPTY
  )
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const ready = draft.name.trim().length > 0

  return (
    <Sheet title={service ? 'Услуга' : 'Новая услуга'} onClose={onClose}>
      <TextField label="Название" value={draft.name} onChange={set('name')} placeholder="Ламинирование бровей" maxLength={60} autoFocus={!service} />
      <StepperField label="Длительность" value={draft.minutes} onChange={set('minutes')} step={10} min={10} max={600} format={duration} />
      <StepperField label="Цена" value={draft.price} onChange={set('price')} step={100} min={0} max={100_000} format={rub} />
      <StepperField label="Расход материалов" value={draft.cost} onChange={set('cost')} step={50} min={0} max={50_000} format={rub} />
      <div className={s.actions}>
        {onRemove ? (
          <Button variant="soft" size="lg" onClick={onRemove}>
            Убрать
          </Button>
        ) : null}
        <Button size="lg" wide disabled={!ready} onClick={() => onSave({ ...draft, name: draft.name.trim() })}>
          Сохранить
        </Button>
      </div>
    </Sheet>
  )
}

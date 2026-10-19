import { useState } from 'react'
import type { Service } from '../../../entities/service'
import { duration, rub } from '../../../shared/lib/format'
import { EmptyState, IconButton, Panel, Screen, Title } from '../../../shared/ui'
import ServiceSheet from './ServiceSheet'
import s from './PricesPage.module.css'

interface PricesPageProps {
  services: readonly Service[]
  onAdd: (draft: Omit<Service, 'id'>) => void
  onUpdate: (id: string, draft: Omit<Service, 'id'>) => void
  onRemove: (id: string) => void
  onBack: () => void
}

// Прайс мастера. Правка не меняет прошлые записи: у каждой свой снимок услуг
export default function PricesPage({ services, onAdd, onUpdate, onRemove, onBack }: PricesPageProps) {
  // undefined — шторка закрыта, null — новая услуга
  const [editing, setEditing] = useState<Service | null | undefined>(undefined)
  const close = () => setEditing(undefined)

  return (
    <>
      <Screen>
        <div className={s.header}>
          <IconButton label="Назад" variant="white" onClick={onBack}>‹</IconButton>
          <Title size="lg">Прайс</Title>
          <IconButton label="Новая услуга" variant="dark" onClick={() => setEditing(null)}>+</IconButton>
        </div>
        <span className={s.lead}>Новые цены действуют для новых записей — прошлые визиты и «Деньги» не изменятся</span>

        {services.length ? (
          <Panel list>
            {services.map((svc) => (
              <button key={svc.id} type="button" className={s.row} onClick={() => setEditing(svc)}>
                <span className={s.text}>
                  <span className={s.name}>{svc.name}</span>
                  <span className={s.meta}>
                    {duration(svc.minutes)}
                    {svc.cost ? ` · материалы ${rub(svc.cost)}` : ''}
                  </span>
                </span>
                <span className={s.price}>{rub(svc.price)}</span>
              </button>
            ))}
          </Panel>
        ) : (
          <EmptyState>В прайсе пока пусто — добавьте первую услугу</EmptyState>
        )}
      </Screen>

      {editing !== undefined ? (
        <ServiceSheet
          service={editing}
          onClose={close}
          onSave={(draft) => {
            if (editing) onUpdate(editing.id, draft)
            else onAdd(draft)
            close()
          }}
          onRemove={
            editing
              ? () => {
                  onRemove(editing.id)
                  close()
                }
              : undefined
          }
        />
      ) : null}
    </>
  )
}

import { useState } from 'react'
import type { Specialty } from '../../../entities/master'
import type { Service } from '../../../entities/service'
import { cx } from '../../../shared/lib/cx'
import { count, duration, rub } from '../../../shared/lib/format'
import { BottomBar, Button, EmptyState, IconButton, Screen, Stack } from '../../../shared/ui'
import ServiceSheet from './ServiceSheet'
import s from './ServicesPage.module.css'

interface ServicesPageProps {
  services: readonly Service[]
  catalog: readonly Specialty[]
  onAdd: (draft: Omit<Service, 'id'>) => void
  onUpdate: (id: string, draft: Omit<Service, 'id'>) => void
  onRemove: (id: string) => void
  onBack: () => void
}

const servicesLabel = (n: number) => count(n, ['услуга', 'услуги', 'услуг'])

// «Мои услуги» (8b): по разделам, правка в шторке. Правка не меняет прошлые
// записи — у каждой свой снимок услуг — и сразу видна в онлайн-записи
export default function ServicesPage({ services, catalog, onAdd, onUpdate, onRemove, onBack }: ServicesPageProps) {
  // undefined — шторка закрыта, null — новая услуга
  const [editing, setEditing] = useState<Service | null | undefined>(undefined)
  const close = () => setEditing(undefined)

  const visible = services.filter((svc) => svc.online).length
  const hidden = services.length - visible
  // Разделы — в порядке каталога; услуга из незнакомого раздела попадёт в «Другое»
  const known = new Set(catalog.map((c) => c.id))
  const groups = catalog
    .map((c) => ({ ...c, items: services.filter((svc) => (known.has(svc.category) ? svc.category : 'other') === c.id) }))
    .filter((g) => g.items.length)

  return (
    <>
      <Screen>
        <div className={s.header}>
          <IconButton label="Назад" variant="white" onClick={onBack}>‹</IconButton>
          <div className={s.titleBox}>
            <span className={s.title}>Мои услуги</span>
            <span className={s.sub}>
              {servicesLabel(visible)} в онлайн-записи{hidden ? ` · ${hidden} скрыто` : ''}
            </span>
          </div>
        </div>

        {groups.length ? (
          groups.map((g) => (
            <Stack key={g.id} gap={8}>
              <span className={s.group}>{g.label}</span>
              <div className={s.list}>
                {g.items.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    className={cx(s.row, !svc.online && s.rowHidden)}
                    onClick={() => setEditing(svc)}
                  >
                    <span className={s.text}>
                      <span className={s.name}>{svc.name}</span>
                      <span className={s.meta}>
                        {duration(svc.minutes)}
                        {svc.online ? '' : ' · скрыта'}
                      </span>
                    </span>
                    <span className={s.price}>{rub(svc.price)}</span>
                    <span className={s.chevron} aria-hidden="true">›</span>
                  </button>
                ))}
              </div>
            </Stack>
          ))
        ) : (
          <EmptyState>Услуг пока нет — добавьте первую</EmptyState>
        )}

        <span className={s.lead}>Новые цены действуют для новых записей — прошлые визиты и «Деньги» не изменятся</span>
      </Screen>

      <BottomBar>
        <Button variant="dark" size="lg" wide onClick={() => setEditing(null)}>
          + Добавить услугу
        </Button>
      </BottomBar>

      {editing !== undefined ? (
        <ServiceSheet
          service={editing}
          catalog={catalog}
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

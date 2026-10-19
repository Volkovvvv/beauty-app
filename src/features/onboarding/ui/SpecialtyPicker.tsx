import type { Specialty } from '../../../entities/master'
import { ChoiceChip } from '../../../shared/ui'
import s from './Onboarding.module.css'

interface SpecialtyPickerProps {
  catalog: readonly Specialty[]
  /** Выбранные id в порядке выбора: первое — основное направление */
  value: string[]
  onChange: (value: string[]) => void
}

// Выбор направлений: чипы с примерами услуг. Порядок нажатий сохраняется
export default function SpecialtyPicker({ catalog, value, onChange }: SpecialtyPickerProps) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <div className={s.grid}>
      {catalog.map((sp) => (
        <ChoiceChip
          key={sp.id}
          selected={value.includes(sp.id)}
          onToggle={() => toggle(sp.id)}
          title={sp.label}
          meta={sp.summary}
        />
      ))}
    </div>
  )
}

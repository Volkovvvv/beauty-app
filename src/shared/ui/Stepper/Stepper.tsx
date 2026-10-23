import s from './Stepper.module.css'

interface StepperProps {
  value: number
  onChange: (value: number) => void
  step: number
  min: number
  max: number
  /** «1 ч 30 мин» */
  format: (value: number) => string
  /** Что меняем — для экранного диктора: «Длительность» */
  label: string
}

// Компактный «− значение +» в строку: длительность услуги в списке и в шторке
export default function Stepper({ value, onChange, step, min, max, format, label }: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  return (
    <div className={s.stepper} role="group" aria-label={label}>
      <button type="button" className={s.btn} aria-label="Меньше" disabled={value <= min} onClick={() => set(value - step)}>
        −
      </button>
      <span className={s.value}>{format(value)}</span>
      <button type="button" className={s.btn} aria-label="Больше" disabled={value >= max} onClick={() => set(value + step)}>
        +
      </button>
    </div>
  )
}

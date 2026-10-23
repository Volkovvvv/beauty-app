import { useId } from 'react'
import { cx } from '../../lib/cx'
import s from './Field.module.css'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  hint?: string
  /** Значение не подходит: рамка и подсказка красные */
  invalid?: boolean
  maxLength?: number
  autoFocus?: boolean
}

// Поле ввода с подписью сверху
export function TextField({ label, value, onChange, placeholder, hint, invalid, maxLength = 200, autoFocus }: TextFieldProps) {
  const id = useId()
  return (
    <div className={s.field}>
      <label className={s.label} htmlFor={id}>{label}</label>
      <input
        id={id}
        className={cx(s.input, invalid && s.invalid)}
        aria-invalid={invalid || undefined}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint ? <span className={cx(s.hint, invalid && s.hintError)}>{hint}</span> : null}
    </div>
  )
}

interface StepperFieldProps {
  label: string
  value: number
  onChange: (value: number) => void
  step: number
  min: number
  max: number
  /** Как показать значение: «1 ч 30 мин», «1 600 ₽» */
  format: (value: number) => string
}

// Число кнопками «−» и «+»: на телефоне это быстрее и точнее клавиатуры
export function StepperField({ label, value, onChange, step, min, max, format }: StepperFieldProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)))
  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      <div className={s.stepper}>
        <button type="button" className={s.step} aria-label="Меньше" disabled={value <= min} onClick={() => set(value - step)}>
          −
        </button>
        <span className={s.value}>{format(value)}</span>
        <button type="button" className={s.step} aria-label="Больше" disabled={value >= max} onClick={() => set(value + step)}>
          +
        </button>
      </div>
    </div>
  )
}

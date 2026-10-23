import s from './PriceInput.module.css'

interface PriceInputProps {
  /** Рубли; 0 — цена не указана */
  value: number
  onChange: (value: number) => void
  label: string
}

// Сколько стоит, в рублях. Только цифры: на телефоне открывается цифровая клавиатура
export default function PriceInput({ value, onChange, label }: PriceInputProps) {
  return (
    <label className={s.box}>
      <input
        className={s.input}
        inputMode="numeric"
        aria-label={label}
        placeholder="0"
        value={value ? String(value) : ''}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '').slice(0, 6)) || 0)}
      />
      <span className={s.rub}>₽</span>
    </label>
  )
}

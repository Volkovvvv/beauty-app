import s from './ToggleRow.module.css'

interface ToggleRowProps {
  title: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

// Строка с переключателем: заголовок, пояснение и тумблер справа
export default function ToggleRow({ title, hint, checked, onChange }: ToggleRowProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={s.row} onClick={() => onChange(!checked)}>
      <span className={s.text}>
        <span className={s.title}>{title}</span>
        {hint ? <span className={s.hint}>{hint}</span> : null}
      </span>
      <span className={s.track} data-on={checked || undefined}>
        <span className={s.knob} />
      </span>
    </button>
  )
}

import type { ReactNode } from 'react'
import s from './StatTile.module.css'

// Плитка-показатель на стеклянной подложке: подпись и крупное число антиквой
export default function StatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={s.tile}>
      <span className={s.label}>{label}</span>
      <span className={s.value}>{value}</span>
    </div>
  )
}

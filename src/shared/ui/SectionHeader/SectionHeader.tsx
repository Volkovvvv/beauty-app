import type { ReactNode } from 'react'
import Title from '../Title/Title'
import s from './SectionHeader.module.css'

// Заголовок секции и действие справа: «День · Открыть календарь»
export default function SectionHeader({ title, aside }: { title: ReactNode; aside?: ReactNode }) {
  return (
    <div className={s.head}>
      <Title size="md" as="h2">{title}</Title>
      {aside}
    </div>
  )
}

import { cx } from '../../lib/cx'
import s from './Avatar.module.css'

interface AvatarProps {
  text: string
  /** 'pearl' — жемчужный градиент, 'rose' — плоская подложка */
  tone?: 'pearl' | 'rose'
  /** 'sm' 44, 'md' 46, 'lg' 84 */
  size?: 'sm' | 'md' | 'lg'
}

// Аватар с инициалами
export default function Avatar({ text, tone = 'pearl', size = 'sm' }: AvatarProps) {
  return (
    <div className={cx(s.avatar, s[tone], s[size])} aria-hidden="true">
      {text}
    </div>
  )
}

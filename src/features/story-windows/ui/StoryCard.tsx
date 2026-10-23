import { forwardRef } from 'react'
import { cx } from '../../../shared/lib/cx'
import { fromMinutes } from '../../../shared/lib/date'
import type { StoryTemplate } from '../model/prefs'
import type { StoryDay } from '../model/windows'
import Fit from './Fit'
import s from './StoryCard.module.css'

interface StoryCardProps {
  template: StoryTemplate
  days: readonly StoryDay[]
  /** «22–28 октября» */
  range: string
  /** «Вика · ногти» */
  name: string
  /** «@vika.nails»; пусто — без подписи */
  handle: string
  /** Размытое фото для шаблона «Фото» (data URL) */
  photo: string | null
  /** Сколько окон не поместилось в кадр */
  onHidden?: (windows: number) => void
}

// Без своего фото — вишнёвые разводы, как в макете
const DEFAULT_PHOTO =
  'radial-gradient(40% 35% at 25% 25%, #e88aa0 0%, rgba(232,138,160,0) 100%), radial-gradient(45% 40% at 80% 70%, #7a1630 0%, rgba(122,22,48,0) 100%), linear-gradient(160deg, #f1c9d1, #b8576c)'

// Сторис 360×640 по шаблонам «Окошки в сторис». Верстка в точках макета:
// превью уменьшает её трансформом, картинка снимается с этого же узла ×3.
const StoryCard = forwardRef<HTMLDivElement, StoryCardProps>(function StoryCard(
  { template, days, range, name, handle, photo, onHidden },
  ref
) {
  const root = cx(s.card, s[template])

  const rows = days.map((d, i) => (
    <div key={d.date} className={cx(s.day, i >= 1 && s.dayBorder)}>
      <span className={s.dayLabel}>{d.label}</span>
      <div className={s.times}>
        {d.times.map((t) => (
          <span key={t} className={s.time}>{fromMinutes(t)}</span>
        ))}
      </div>
    </div>
  ))
  // Новый набор окон или вёрстка — подбор размера заново, с чистого листа
  const fitKey = `${template}|${days.map((d) => d.date + d.times.join()).join('|')}`
  const list = (
    <Fit
      key={fitKey}
      rows={rows}
      wrap={(shown) => {
        const grid = <div className={s.grid}>{shown}</div>
        return template === 'photo' ? <div className={s.glass}>{grid}</div> : grid
      }}
      onHidden={(n) => onHidden?.(days.slice(n).reduce((sum, d) => sum + d.times.length, 0))}
    />
  )

  if (template === 'cream') {
    return (
      <div ref={ref} className={root}>
        <div className={s.creamTop}>
          <span>{name}</span>
          <span>{range}</span>
        </div>
        <div className={s.title}>
          Свободное
          <br />
          <i className={s.accent}>время</i>
        </div>
        {list}
        <div className={s.creamFooter}>
          <span className={s.creamCta}>Пиши в директ →</span>
          {handle ? <span className={s.handle}>{handle}</span> : null}
        </div>
      </div>
    )
  }

  if (template === 'night') {
    return (
      <div ref={ref} className={root}>
        <span className={s.nightName}>{name}</span>
        <div className={s.title}>
          Окошки
          <br />
          <i className={s.accent}>на неделю</i>
        </div>
        {list}
        <div className={s.nightFooter}>
          <span className={s.ctaText}>Пиши в директ</span>
          {handle ? <span className={s.handle}>{handle}</span> : null}
        </div>
      </div>
    )
  }

  const body = (
    <>
      <span className={s.name}>{name}</span>
      <div className={s.title}>
        Свободные
        <br />
        окошки
      </div>
      <span className={s.range}>{range}</span>
      {list}
      <div className={s.footer}>
        <span className={s.cta}>Пиши в директ</span>
        {handle ? <span className={s.handle}>{handle}</span> : null}
      </div>
    </>
  )

  if (template === 'photo') {
    return (
      <div ref={ref} className={root}>
        <div className={s.photoBg} style={{ backgroundImage: photo ? `url(${photo})` : DEFAULT_PHOTO }} />
        <div className={s.photoShade} />
        <div className={s.photoContent}>{body}</div>
      </div>
    )
  }

  return (
    <div ref={ref} className={root}>
      {body}
    </div>
  )
})

export default StoryCard

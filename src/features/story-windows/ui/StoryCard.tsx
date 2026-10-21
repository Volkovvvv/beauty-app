import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cx } from '../../../shared/lib/cx'
import { fromMinutes } from '../../../shared/lib/date'
import type { StoryTemplate } from '../model/prefs'
import type { StoryDay } from '../model/windows'
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
  /** Месяц: окон много, сетка плотнее */
  compact: boolean
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
  { template, days, range, name, handle, compact, photo, onHidden },
  ref
) {
  const root = cx(s.card, s[template], compact && s.compact)

  const rows = days.map((d, i) => (
    <div key={d.date} className={cx(s.day, i >= (compact ? 2 : 1) && s.dayBorder)}>
      <span className={s.dayLabel}>{d.label}</span>
      <div className={s.times}>
        {d.times.map((t) => (
          <span key={t} className={s.time}>{fromMinutes(t)}</span>
        ))}
      </div>
    </div>
  ))
  // Новый набор окон или вёрстка — подбор размера заново, с чистого листа
  const fitKey = `${template}|${compact}|${days.map((d) => d.date + d.times.join()).join('|')}`
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
          <i className={s.accent}>{compact ? 'на месяц' : 'на неделю'}</i>
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

// Мельче этого время в сторис уже не прочитать
const MIN_SCALE = 0.75

interface FitProps {
  rows: ReactNode[]
  wrap: (rows: ReactNode[]) => ReactNode
  /** Сколько строк поместилось; остальные в кадр не попали */
  onHidden: (shown: number) => void
}

// Окон за месяц бывает больше, чем влезает в кадр. Сначала список
// чуть уменьшается целиком, а если и так не влез — последние дни
// не показываются, и шторка говорит мастеру, сколько окон не поместилось.
function Fit({ rows, wrap, onHidden }: FitProps) {
  const box = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [limit, setLimit] = useState(rows.length)

  useLayoutEffect(() => {
    if (!box.current || !inner.current) return
    // offset* — размеры вёрстки: трансформы, и наш, и превью, на них не влияют.
    // Уменьшаем от центра, высота вёрстки от масштаба не зависит — пересчёт не качается
    const free = box.current.offsetHeight
    const need = inner.current.offsetHeight
    if (!free || !need) return
    const fit = Math.min(1, free / need)
    if (fit >= MIN_SCALE || limit <= 1) {
      if (Math.abs(fit - scale) > 0.01) setScale(Math.max(MIN_SCALE, fit))
      return
    }
    // Строки примерно одной высоты: прыгаем сразу к оценке, дальше по одной
    const estimate = Math.floor((limit * free) / (need * MIN_SCALE))
    setLimit(Math.max(1, Math.min(limit - 1, estimate)))
  })

  // Колбэк через ref: родитель передаёт новую функцию на каждый рендер
  const report = useRef(onHidden)
  report.current = onHidden
  useEffect(() => report.current(limit), [limit])

  const style: CSSProperties | undefined = scale < 1 ? { transform: `scale(${scale})` } : undefined
  return (
    <div ref={box} className={s.fit}>
      <div ref={inner} className={s.fitInner} style={style}>
        {wrap(rows.slice(0, limit))}
      </div>
    </div>
  )
}

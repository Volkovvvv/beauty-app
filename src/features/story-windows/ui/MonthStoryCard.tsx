import { forwardRef } from 'react'
import { cx } from '../../../shared/lib/cx'
import { dayOfMonth, fromMinutes, weekday, WEEKDAYS } from '../../../shared/lib/date'
import type { StoryPage } from '../model/month'
import type { StoryTemplate } from '../model/prefs'
import Fit from './Fit'
import s from './MonthStoryCard.module.css'

interface MonthStoryCardProps {
  template: StoryTemplate
  page: StoryPage
  /** «1 / 4» */
  pageLabel: string
  /** «Вика · ногти» */
  name: string
  /** «@vika.nails»; пусто — без подписи */
  handle: string
  /** Размытое фото для шаблона «Фото» (data URL) */
  photo: string | null
  /** Сколько окон не поместилось в кадр */
  onHidden?: (windows: number) => void
}

const DEFAULT_PHOTO =
  'radial-gradient(40% 35% at 25% 25%, #e88aa0 0%, rgba(232,138,160,0) 100%), radial-gradient(45% 40% at 80% 70%, #7a1630 0%, rgba(122,22,48,0) 100%), linear-gradient(160deg, #f1c9d1, #b8576c)'

// Больше шести дней на сторис бывает, когда в неё влился хвост месяца:
// строки и чипы плотнее, заголовок короче
const TIGHT_DAYS = 6

// Сторис серии «окошки на месяц» — неделя на карточке, макет MonthStory.dc.html.
// Верстка 360×640, картинка снимается с этого узла ×3, как у StoryCard
const MonthStoryCard = forwardRef<HTMLDivElement, MonthStoryCardProps>(function MonthStoryCard(
  { template, page, pageLabel, name, handle, photo, onHidden },
  ref
) {
  const tight = page.days.length > TIGHT_DAYS
  const rows = page.days.map((d) => (
    <div key={d.date} className={s.row}>
      <div className={s.date}>
        <span className={s.wd}>{WEEKDAYS[weekday(d.date)]}</span>
        <span className={s.num}>{String(dayOfMonth(d.date)).padStart(2, '0')}</span>
      </div>
      <div className={s.chips}>
        {d.times.map((t) => (
          <span key={t} className={s.chip}>{fromMinutes(t)}</span>
        ))}
      </div>
    </div>
  ))
  const fitKey = `${template}|${page.days.map((d) => d.date + d.times.join()).join('|')}`

  return (
    <div ref={ref} className={cx(s.card, s[template], tight && s.tight)}>
      {template === 'photo' ? (
        <>
          <div className={s.photoBg} style={{ backgroundImage: photo ? `url(${photo})` : DEFAULT_PHOTO }} />
          <div className={s.photoShade} />
        </>
      ) : null}
      <div className={s.content}>
        <div className={s.top}>
          <span className={s.name}>{name}</span>
          <span className={s.page}>{pageLabel}</span>
        </div>
        <div className={s.head}>
          <div className={s.title}>{tight ? 'Окошки' : 'Свободные окошки'}</div>
          <span className={s.range}>{page.range}</span>
        </div>
        <Fit
          key={fitKey}
          rows={rows}
          wrap={(shown) => <div className={s.rows}>{shown}</div>}
          onHidden={(n) => onHidden?.(page.days.slice(n).reduce((sum, d) => sum + d.times.length, 0))}
        />
        <div className={s.footer}>
          <span className={s.cta}>Пиши в директ</span>
          {handle ? <span className={s.handle}>{handle}</span> : null}
        </div>
      </div>
    </div>
  )
})

export default MonthStoryCard

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import s from './Fit.module.css'

// Мельче этого время в сторис уже не прочитать
const MIN_SCALE = 0.75

interface FitProps {
  rows: ReactNode[]
  wrap: (rows: ReactNode[]) => ReactNode
  /** Сколько строк поместилось; остальные в кадр не попали */
  onHidden: (shown: number) => void
}

// Окон бывает больше, чем влезает в кадр. Сначала список
// чуть уменьшается целиком, а если и так не влез — последние дни
// не показываются, и шторка говорит мастеру, сколько окон не поместилось.
export default function Fit({ rows, wrap, onHidden }: FitProps) {
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

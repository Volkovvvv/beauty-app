import { useEffect, useState } from 'react'
import { nowMinutes, todayISO, type ISODate } from './date'

export interface Now {
  date: ISODate
  /** Минуты от полуночи */
  minutes: number
}

const read = (): Now => ({ date: todayISO(), minutes: nowMinutes() })

// Текущие дата и минуты, обновляются раз в полминуты: обратный отсчёт
// до следующей клиентки должен идти сам. Пока минута та же, отдаём
// прежний объект — иначе каждый тик перерисовывал бы всё приложение.
// zone — пояс мастера: сменился — «сейчас» пересчитывается сразу, не через полминуты
export function useNow(zone?: string): Now {
  const [now, setNow] = useState(read)

  useEffect(() => {
    setNow(read())
  }, [zone])

  useEffect(() => {
    const id = setInterval(() => {
      setNow((prev) => {
        const next = read()
        return next.minutes === prev.minutes && next.date === prev.date ? prev : next
      })
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  return now
}

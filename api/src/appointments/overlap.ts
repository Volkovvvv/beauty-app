/** Отрезок времени записи: начало и длительность в минутах. */
export interface Slot {
  startsAt: Date
  duration: number
}

const end = (s: Slot) => s.startsAt.getTime() + s.duration * 60_000

/** Пересекаются ли [начало, конец) двух записей. Встык — не пересечение. */
export function overlaps(a: Slot, b: Slot): boolean {
  return a.startsAt.getTime() < end(b) && b.startsAt.getTime() < end(a)
}

/** Самая длинная запись, которую допускает API, — от неё окно поиска пересечений. */
export const MAX_DURATION_MINUTES = 600

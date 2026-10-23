/** Услуга прайса мастера. Деньги на фронте — рубли (сервер хранит копейки). */
export interface Service {
  id: string
  name: string
  minutes: number
  price: number
  /** Раздел — id сферы из каталога («nails», «brows»…) */
  category: string
  /** Видна клиенткам в онлайн-записи */
  online: boolean
}

type List = readonly Service[]

export const servicesMinutes = (list: List): number => list.reduce((sum, s) => sum + s.minutes, 0)
export const servicesPrice = (list: List): number => list.reduce((sum, s) => sum + s.price, 0)

/** «Маникюр + гель-лак»: первая с заглавной, остальные строчными */
export function servicesTitle(list: List): string {
  return list.map((s, i) => (i ? s.name.toLowerCase() : s.name)).join(' + ')
}

/** Главная услуга записи — самая дорогая. По ней считается выручка «По услугам» */
export function mainService(list: List): Service | null {
  let best: Service | null = null
  for (const s of list) if (!best || s.price > best.price) best = s
  return best
}

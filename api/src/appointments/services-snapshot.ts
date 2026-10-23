/**
 * Снимок услуг записи (Appointment.services).
 *
 * Запись хранит копию услуг на момент создания: мастер поднял цену
 * или убрал услугу из прайса — прошлые визиты и «Деньги» не меняются.
 */
export interface ServiceSnapshot {
  id: string
  name: string
  minutes: number
  /** Копейки */
  price: number
}

/**
 * Снимок в порядке, в котором услуги выбраны. null — какой-то id не нашёлся
 * в прайсе мастера (чужая или убранная услуга): записывать такое нельзя.
 */
export function buildSnapshot(ids: readonly string[], priceList: readonly ServiceSnapshot[]): ServiceSnapshot[] | null {
  const byId = new Map(priceList.map((s) => [s.id, s]))
  const unique = [...new Set(ids)]
  const picked: ServiceSnapshot[] = []
  for (const id of unique) {
    const s = byId.get(id)
    if (!s) return null
    picked.push({ id: s.id, name: s.name, minutes: s.minutes, price: s.price })
  }
  return picked
}

export const snapshotMinutes = (s: readonly ServiceSnapshot[]): number => s.reduce((sum, x) => sum + x.minutes, 0)
export const snapshotPrice = (s: readonly ServiceSnapshot[]): number => s.reduce((sum, x) => sum + x.price, 0)

/** «Коррекция + дизайн» — для текстов бота */
export function snapshotTitle(s: readonly ServiceSnapshot[]): string {
  return s.map((x, i) => (i ? x.name.toLowerCase() : x.name)).join(' + ')
}

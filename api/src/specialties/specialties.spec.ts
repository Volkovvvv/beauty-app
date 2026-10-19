import { defaultRepeatWeeks, isCorrection, SPECIALTIES, starterServices } from './specialties'

describe('каталог специализаций', () => {
  it('у каждой специализации уникальный id, есть услуги и разумные цены', () => {
    expect(new Set(SPECIALTIES.map((s) => s.id)).size).toBe(SPECIALTIES.length)
    for (const s of SPECIALTIES) {
      expect(s.services.length).toBeGreaterThan(0)
      for (const svc of s.services) {
        expect(Number.isInteger(svc.price)).toBe(true)
        expect(svc.minutes).toBeGreaterThanOrEqual(5)
        expect(svc.minutes).toBeLessThanOrEqual(600)
        expect(svc.cost).toBeLessThan(svc.price)
      }
    }
  })

  it('стартовый прайс — из всех выбранных специализаций, без повторов уже заведённых', () => {
    const names = starterServices(['brows', 'lashes'], ['коррекция бровей']).map((s) => s.name)
    expect(names).not.toContain('Коррекция бровей')
    expect(names).toContain('Окрашивание бровей')
    expect(names).toContain('Коррекция ресниц')
  })

  it('неизвестная специализация ничего не добавляет', () => {
    expect(starterServices(['tattoo'], [])).toEqual([])
  })

  it('интервал и слово «коррекция» — по специализациям мастера', () => {
    expect(defaultRepeatWeeks(['hair', 'nails'])).toBe(6)
    expect(defaultRepeatWeeks([])).toBe(4)
    expect(isCorrection(['nails', 'lashes'])).toBe(true)
    expect(isCorrection(['nails', 'hair'])).toBe(false)
    expect(isCorrection([])).toBe(false)
  })
})

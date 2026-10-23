import { defaultRepeatWeeks, isCorrection, SPECIALTIES } from './specialties'

describe('каталог специализаций', () => {
  it('у каждой специализации уникальный id, подсказки без повторов и с разумной длительностью', () => {
    expect(new Set(SPECIALTIES.map((s) => s.id)).size).toBe(SPECIALTIES.length)
    for (const s of SPECIALTIES) {
      expect(new Set(s.suggestions.map((x) => x.name)).size).toBe(s.suggestions.length)
      for (const x of s.suggestions) {
        expect(x.minutes).toBeGreaterThanOrEqual(5)
        expect(x.minutes).toBeLessThanOrEqual(600)
      }
    }
  })

  it('«Другое» — последним и без подсказок', () => {
    const last = SPECIALTIES[SPECIALTIES.length - 1]
    expect(last.id).toBe('other')
    expect(last.suggestions).toEqual([])
  })

  it('интервал и слово «коррекция» — по специализациям мастера', () => {
    expect(defaultRepeatWeeks(['hair', 'nails'])).toBe(6)
    expect(defaultRepeatWeeks([])).toBe(4)
    expect(isCorrection(['nails', 'brows'])).toBe(true)
    expect(isCorrection(['nails', 'hair'])).toBe(false)
    expect(isCorrection([])).toBe(false)
  })
})

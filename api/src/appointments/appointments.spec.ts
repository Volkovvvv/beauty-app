import { overlaps } from './overlap'
import { buildSnapshot, snapshotMinutes, snapshotPrice, snapshotTitle } from './services-snapshot'

const at = (hhmm: string) => new Date(`2026-10-22T${hhmm}:00+03:00`)

describe('overlaps', () => {
  it('видит пересечение и вложенность', () => {
    expect(overlaps({ startsAt: at('12:00'), duration: 150 }, { startsAt: at('14:00'), duration: 60 })).toBe(true)
    expect(overlaps({ startsAt: at('12:00'), duration: 240 }, { startsAt: at('13:00'), duration: 30 })).toBe(true)
  })

  it('записи встык не пересекаются', () => {
    expect(overlaps({ startsAt: at('12:00'), duration: 150 }, { startsAt: at('14:30'), duration: 60 })).toBe(false)
    expect(overlaps({ startsAt: at('14:30'), duration: 60 }, { startsAt: at('12:00'), duration: 150 })).toBe(false)
  })
})

describe('buildSnapshot', () => {
  const list = [
    { id: 'a', name: 'Коррекция', minutes: 90, price: 260_000, cost: 25_000 },
    { id: 'b', name: 'Дизайн', minutes: 30, price: 50_000, cost: 6_000 },
  ]

  it('копирует услуги в порядке выбора и считает итог', () => {
    const s = buildSnapshot(['a', 'b', 'a'], list)!
    expect(s.map((x) => x.id)).toEqual(['a', 'b'])
    expect(snapshotMinutes(s)).toBe(120)
    expect(snapshotPrice(s)).toBe(310_000)
    expect(snapshotTitle(s)).toBe('Коррекция + дизайн')
  })

  it('не пускает услугу не из прайса мастера', () => {
    expect(buildSnapshot(['a', 'чужая'], list)).toBeNull()
  })
})

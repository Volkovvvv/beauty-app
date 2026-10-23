import { InstagramError, normalizeInstagram } from './instagram'

describe('ник Instagram', () => {
  it('приводит @ник и ссылку на профиль к нику', () => {
    expect(normalizeInstagram('@vika.nails')).toBe('vika.nails')
    expect(normalizeInstagram(' vika_nails ')).toBe('vika_nails')
    expect(normalizeInstagram('https://www.instagram.com/vika.nails/?igsh=abc')).toBe('vika.nails')
    expect(normalizeInstagram('instagram.com/vika.nails')).toBe('vika.nails')
  })

  it('пустое — нет ника', () => {
    expect(normalizeInstagram('')).toBeNull()
    expect(normalizeInstagram('  @ ')).toBeNull()
  })

  it('кириллица, пробелы и слишком длинный ник — ошибка', () => {
    expect(() => normalizeInstagram('вика')).toThrow(InstagramError)
    expect(() => normalizeInstagram('vika nails')).toThrow(InstagramError)
    expect(() => normalizeInstagram('a'.repeat(31))).toThrow(InstagramError)
  })
})

import { dateTime, rubles, toCsv } from './export-csv'

describe('toCsv', () => {
  it('ставит BOM, разделитель «;» и экранирует кавычки', () => {
    const csv = toCsv(['Имя', 'Заметка'], [['Анна', 'любит "нюд"; short']])
    expect(csv.startsWith('﻿Имя;Заметка\r\n')).toBe(true)
    expect(csv).toContain('Анна;"любит ""нюд""; short"')
  })

  it('гасит формулы и убирает переводы строк', () => {
    const csv = toCsv(['a'], [['=HYPERLINK("x")'], ['строка1\nстрока2'], [5], [null]])
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`)
    expect(csv).toContain('строка1 строка2')
    expect(csv).toContain('\r\n5\r\n\r\n')
  })
})

describe('rubles', () => {
  it('переводит копейки', () => {
    expect(rubles(150000)).toBe('1500')
    expect(rubles(150050)).toBe('1500,50')
    expect(rubles(0)).toBe('0')
  })
})

describe('dateTime', () => {
  it('показывает время в поясе мастера', () => {
    const d = new Date('2026-11-11T11:30:00Z')
    expect(dateTime(d, 'Europe/Moscow')).toEqual({ date: '11.11.2026', time: '14:30' })
    expect(dateTime(d, 'Asia/Yekaterinburg')).toEqual({ date: '11.11.2026', time: '16:30' })
  })
})

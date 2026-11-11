/**
 * Выгрузка кабинета в CSV, который открывается в Excel и Google Таблицах.
 * Разделитель «;» и BOM в начале — иначе русский Excel склеит колонки
 * и покажет кракозябры.
 */

type Cell = string | number | null | undefined

/** Ячейка, начинающаяся с = + - @, в Excel станет формулой: гасим апострофом */
function cell(value: Cell): string {
  if (value === null || value === undefined) return ''
  let text = String(value).replace(/\r?\n/g, ' ')
  if (/^[=+\-@\t]/.test(text) && typeof value === 'string') text = `'${text}`
  return /[";]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(cell).join(';'))
  return `﻿${lines.join('\r\n')}\r\n`
}

/** Копейки → «1500» или «1500,50» */
export function rubles(kopecks: number): string {
  const whole = Math.trunc(kopecks / 100)
  const rest = Math.abs(kopecks % 100)
  return rest ? `${whole},${String(rest).padStart(2, '0')}` : String(whole)
}

/** «11.11.2026» и «14:30» в поясе мастера */
export function dateTime(date: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return { date: `${get('day')}.${get('month')}.${get('year')}`, time: `${get('hour')}:${get('minute')}` }
}

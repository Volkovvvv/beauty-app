export const rub = (n: number): string => `${Math.round(n).toLocaleString('ru-RU')} ₽`

/** 100 → «1 ч 40 мин» */
export function duration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return [h ? `${h} ч` : '', m ? `${m} мин` : ''].filter(Boolean).join(' ') || '0 мин'
}

/** Подписи столбиков: 11 400 → «11,4к» */
export function compact(n: number): string {
  if (!n) return ''
  if (n < 1000) return String(n)
  return `${(Math.round(n / 100) / 10).toString().replace('.', ',')}к`
}

/** Формы слова для 1, 2–4 и 5+: ['запись', 'записи', 'записей'] */
export type PluralForms = readonly [string, string, string]

export function plural(n: number, [one, few, many]: PluralForms): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few
  return many
}

export const count = (n: number, forms: PluralForms): string => `${n} ${plural(n, forms)}`

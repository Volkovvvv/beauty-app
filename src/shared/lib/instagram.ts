// Та же проверка, что на сервере (api/src/masters/instagram.ts): ошибку
// видно сразу у поля, а не после отправки всего знакомства
const HANDLE = /^[a-z0-9._]{1,30}$/i

/** Ник из «@ник» или ссылки на профиль; '' — пусто; null — так ник не пишется */
export function instagramHandle(raw: string): string | null {
  const value = raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
  if (!value) return ''
  return HANDLE.test(value) ? value : null
}

export const INSTAGRAM_ERROR = 'Ник в Instagram — латиница, цифры, точка и подчёркивание'

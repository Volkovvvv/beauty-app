/** Что считается ником Instagram: латиница, цифры, точка и подчёркивание, до 30 символов */
const HANDLE = /^[a-z0-9._]{1,30}$/i

export class InstagramError extends Error {}

/**
 * Ник из того, что вписал мастер: «@vika.nails», «vika.nails»
 * или ссылка на профиль. Пустое — null, нет ника.
 */
export function normalizeInstagram(raw: string): string | null {
  const value = raw
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/^@/, '')
  if (!value) return null
  if (!HANDLE.test(value)) throw new InstagramError('Ник в Instagram — латиница, цифры, точка и подчёркивание')
  return value
}

import type { PhotoMime } from './dto/photo.dto'

/** Предел картинки после декодирования: сжатое фото с телефона сильно меньше. */
export const MAX_PHOTO_BYTES = 1_500_000

// Первые байты форматов. Тип проверяется по содержимому, а не по слову клиента:
// иначе под видом image/png можно сохранить HTML и отдать его нашим доменом.
const SIGNATURES: Record<PhotoMime, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  'image/webp': (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
}

/** Совпадает ли содержимое с заявленным типом картинки */
export function matchesMime(data: Buffer, mime: PhotoMime): boolean {
  return data.length >= 12 && SIGNATURES[mime](data)
}

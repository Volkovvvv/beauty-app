import { IsBase64, IsIn, IsString, MaxLength, MinLength } from 'class-validator'

export const PHOTO_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type PhotoMime = (typeof PHOTO_MIMES)[number]

export class AddPhotoDto {
  /** Подпись под фото: «Кошачий глаз». */
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label!: string

  @IsIn(PHOTO_MIMES, { message: 'Фото — JPEG, PNG или WebP' })
  mime!: PhotoMime

  /** Картинка в base64 без префикса data:. Клиент сжимает её до ~300 КБ. */
  @IsBase64()
  @MaxLength(2_000_000)
  data!: string
}

import { IsBase64, MaxLength } from 'class-validator'

export class CreateStoryDto {
  /** JPEG 1080×1920 в base64 без префикса data:. Обычно 300–800 КБ. */
  @IsBase64()
  @MaxLength(4_000_000)
  data!: string
}

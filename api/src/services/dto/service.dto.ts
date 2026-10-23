import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { MAX_PRICE_KOPECKS } from '../../common/money'
import { SPECIALTY_IDS } from '../../specialties/specialties'

export const MIN_SERVICE_MINUTES = 5
export const MAX_SERVICE_MINUTES = 600

export class CreateServiceDto {
  @IsString()
  @MinLength(1, { message: 'Название не может быть пустым' })
  @MaxLength(60, { message: 'Название длиннее 60 символов' })
  name!: string

  /** Длительность, минуты. Дольше 10 часов одна услуга не идёт. */
  @IsInt()
  @Min(MIN_SERVICE_MINUTES, { message: 'Услуга короче 5 минут' })
  @Max(MAX_SERVICE_MINUTES, { message: 'Услуга дольше 10 часов' })
  minutes!: number

  /** Цена, копейки. */
  @IsInt({ message: 'Цена должна быть целым числом копеек' })
  @Min(0)
  @Max(MAX_PRICE_KOPECKS)
  price!: number

  /** Раздел — id специализации из каталога */
  @IsIn(SPECIALTY_IDS, { message: 'Неизвестный раздел' })
  category!: string

  /** Показывать клиенткам в онлайн-записи. По умолчанию — да */
  @IsOptional()
  @IsBoolean()
  online?: boolean
}

// Поля те же, что при создании, но все необязательные
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Название не может быть пустым' })
  @MaxLength(60, { message: 'Название длиннее 60 символов' })
  name?: string

  @IsOptional()
  @IsInt()
  @Min(MIN_SERVICE_MINUTES, { message: 'Услуга короче 5 минут' })
  @Max(MAX_SERVICE_MINUTES, { message: 'Услуга дольше 10 часов' })
  minutes?: number

  @IsOptional()
  @IsInt({ message: 'Цена должна быть целым числом копеек' })
  @Min(0)
  @Max(MAX_PRICE_KOPECKS)
  price?: number

  @IsOptional()
  @IsIn(SPECIALTY_IDS, { message: 'Неизвестный раздел' })
  category?: string

  @IsOptional()
  @IsBoolean()
  online?: boolean

  /** Место в прайсе. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sort?: number
}

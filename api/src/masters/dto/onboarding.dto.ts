import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { MAX_PRICE_KOPECKS } from '../../common/money'
import { MAX_SERVICE_MINUTES, MIN_SERVICE_MINUTES } from '../../services/dto/service.dto'
import { SPECIALTY_IDS } from '../../specialties/specialties'

export class OnboardingServiceDto {
  @IsString()
  @MinLength(1, { message: 'У услуги нет названия' })
  @MaxLength(60, { message: 'Название длиннее 60 символов' })
  name!: string

  @IsInt()
  @Min(MIN_SERVICE_MINUTES, { message: 'Услуга короче 5 минут' })
  @Max(MAX_SERVICE_MINUTES, { message: 'Услуга дольше 10 часов' })
  minutes!: number

  /** Копейки. Бесплатная услуга при знакомстве — почти всегда забытая цена */
  @IsInt({ message: 'Цена должна быть целым числом копеек' })
  @Min(1, { message: 'Укажите цену услуги' })
  @Max(MAX_PRICE_KOPECKS)
  price!: number

  @IsIn(SPECIALTY_IDS, { message: 'Неизвестный раздел' })
  category!: string
}

/** Знакомство целиком: о мастере, сферы и свои услуги — одним запросом */
export class OnboardingDto {
  @IsString()
  @MinLength(1, { message: 'Как вас зовут?' })
  @MaxLength(100)
  displayName!: string

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Адрес длиннее 200 символов' })
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram?: string

  @IsArray()
  @ArrayMinSize(1, { message: 'Выберите хотя бы одну сферу' })
  @ArrayMaxSize(SPECIALTY_IDS.length)
  @IsIn(SPECIALTY_IDS, { each: true, message: 'Неизвестная сфера' })
  specialties!: string[]

  @IsArray()
  @ArrayMinSize(1, { message: 'Добавьте хотя бы одну услугу' })
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => OnboardingServiceDto)
  services!: OnboardingServiceDto[]
}

import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { MAX_PRICE_KOPECKS } from '../../common/money'

export class CreateServiceDto {
  @IsString()
  @MinLength(1, { message: 'Название не может быть пустым' })
  @MaxLength(60)
  name!: string

  /** Длительность, минуты. Дольше 10 часов одна услуга не идёт. */
  @IsInt()
  @Min(5)
  @Max(600)
  minutes!: number

  /** Цена, копейки. */
  @IsInt({ message: 'Цена должна быть целым числом копеек' })
  @Min(0)
  @Max(MAX_PRICE_KOPECKS)
  price!: number

  /** Расход материалов на услугу, копейки. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_KOPECKS)
  cost?: number
}

// Поля те же, что при создании, но все необязательные
export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Название не может быть пустым' })
  @MaxLength(60)
  name?: string

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(600)
  minutes?: number

  @IsOptional()
  @IsInt({ message: 'Цена должна быть целым числом копеек' })
  @Min(0)
  @Max(MAX_PRICE_KOPECKS)
  price?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_KOPECKS)
  cost?: number

  /** Место в прайсе. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  sort?: number
}

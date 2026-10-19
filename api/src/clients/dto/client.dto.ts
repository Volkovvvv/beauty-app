import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

// Поля карточки общие у создания и правки
class ClientCardFields {
  /** Раз в сколько недель обычно приходит; не указан — по направлению мастера. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(26)
  repeatWeeks?: number

  /** Особенности по направлению мастера: форма ногтей, тип кожи, волосы. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shape?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  likes?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(200)
  allergy?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(100)
  payment?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null
}

export class CreateClientDto extends ClientCardFields {
  @IsString()
  @MinLength(1, { message: 'Имя не может быть пустым' })
  @MaxLength(100)
  name!: string
}

export class UpdateClientDto extends ClientCardFields {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Имя не может быть пустым' })
  @MaxLength(100)
  name?: string
}

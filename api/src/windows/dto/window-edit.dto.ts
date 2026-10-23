import { Type } from 'class-transformer'
import { ArrayMaxSize, IsArray, IsInt, Matches, Max, Min, ValidateNested } from 'class-validator'

// Местная дата мастера: «2026-11-10». Сверх формата проверяет сервис —
// 2026-02-31 под регулярку подходит
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const DATE_MESSAGE = 'Дата в формате YYYY-MM-DD'

// Окон в сутках не больше 24, с запасом на нестандартный рабочий день
const MAX_TIMES = 48
// Правка «так же на все среды» трогает несколько дней одного-двух месяцев
export const MAX_DAYS = 62

export class ListWindowEditsDto {
  @Matches(ISO_DATE, { message: DATE_MESSAGE })
  from!: string

  @Matches(ISO_DATE, { message: DATE_MESSAGE })
  to!: string
}

export class WindowEditDto {
  @Matches(ISO_DATE, { message: DATE_MESSAGE })
  date!: string

  /** Часы сверх расчёта: начала окон, минуты от полуночи */
  @IsArray()
  @ArrayMaxSize(MAX_TIMES)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1439, { each: true })
  add!: number[]

  /** Часы, которые мастер убрал из расчёта */
  @IsArray()
  @ArrayMaxSize(MAX_TIMES)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(1439, { each: true })
  rem!: number[]
}

export class SaveWindowEditsDto {
  /** Правки по дням. Пустые add и rem — день возвращается к расчёту */
  @IsArray()
  @ArrayMaxSize(MAX_DAYS)
  @ValidateNested({ each: true })
  @Type(() => WindowEditDto)
  days!: WindowEditDto[]
}

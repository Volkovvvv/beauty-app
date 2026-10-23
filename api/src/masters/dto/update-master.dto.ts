import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { SPECIALTY_IDS } from '../../specialties/specialties'

export class UpdateMasterDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Имя не может быть пустым' })
  @MaxLength(100)
  displayName?: string

  /** Где принимает. Пустая строка — убрать адрес */
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Адрес длиннее 200 символов' })
  address?: string

  /** Ник или ссылка на профиль; сервер оставит только ник. Пустая строка — убрать */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram?: string

  /** Чем занимается мастер — id из каталога. Услуги от этого не меняются */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Выберите хотя бы одну сферу' })
  @ArrayMaxSize(SPECIALTY_IDS.length)
  @IsIn(SPECIALTY_IDS, { each: true, message: 'Неизвестная сфера' })
  specialties?: string[]

  /** Начало рабочего дня, минуты от полуночи. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1439)
  dayStart?: number

  /** Конец рабочего дня, минуты от полуночи; 1440 — до полуночи. */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  dayEnd?: number

  /** Рабочие дни недели: 0 — понедельник … 6 — воскресенье. Пустой список — отпуск. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workDays?: number[]

  /** За сколько часов до визита напомнить. 0 — выключено, предел — неделя. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  notifyBeforeHours?: number

  /** Второе напоминание за N минут. 0 — выключено. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  notifyBeforeMinutes?: number
}

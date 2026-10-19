import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'
import { SPECIALTY_IDS } from '../../specialties/specialties'

export class UpdateMasterDto {
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Имя не может быть пустым' })
  @MaxLength(100)
  displayName?: string

  /** Чем занимается мастер — id из каталога. Новые добавляют свой стартовый прайс */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Выберите хотя бы одно направление' })
  @ArrayMaxSize(SPECIALTY_IDS.length)
  @IsIn(SPECIALTY_IDS, { each: true, message: 'Неизвестная специализация' })
  specialties?: string[]

  /** true — первый вход пройден. Сбросить обратно нельзя */
  @IsOptional()
  @IsBoolean()
  onboarded?: boolean

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

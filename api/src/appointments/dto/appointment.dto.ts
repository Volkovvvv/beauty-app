import { AppointmentStatus } from '@prisma/client'
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { MAX_PRICE_KOPECKS } from '../../common/money'
import { MAX_DURATION_MINUTES } from '../overlap'

export class CreateAppointmentDto {
  @IsUUID()
  clientId!: string

  /**
   * Начало в ISO 8601 со смещением: "2026-10-22T12:00:00+03:00".
   * Строка без зоны неоднозначна — планировщик не поймёт, когда визит на самом деле.
   */
  @IsISO8601({ strict: true }, { message: 'startsAt должен быть датой ISO 8601' })
  startsAt!: string

  /** Услуги из прайса мастера. Длительность и цену сервер считает сам. */
  @IsArray()
  @ArrayMinSize(1, { message: 'Выберите хотя бы одну услугу' })
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  serviceIds!: string[]

  /**
   * Своя длительность, минуты: мастер поставил «на 30 минут», а по прайсу выходит час.
   * Не передана — сумма услуг. Цену не меняет.
   */
  @IsOptional()
  @IsInt()
  @Min(5, { message: 'Запись короче 5 минут' })
  @Max(MAX_DURATION_MINUTES, { message: 'Запись дольше 10 часов — разбейте её на два визита' })
  duration?: number

  /** Уточнение: «кошачий глаз», «миндаль». */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string

  /** Напомнить клиентке о визите. */
  @IsOptional()
  @IsBoolean()
  remind?: boolean

  /** Через repeatWeeks позвать на коррекцию. */
  @IsOptional()
  @IsBoolean()
  rebook?: boolean
}

export class UpdateAppointmentDto {
  /** Перенос на другое время. */
  @IsOptional()
  @IsISO8601({ strict: true })
  startsAt?: string

  /** Другой набор услуг — снимок, длительность и цена пересчитываются. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('all', { each: true })
  serviceIds?: string[]

  /**
   * Своя длительность, минуты: мастер поставил «на 30 минут», а по прайсу выходит час.
   * Не передана, а услуги поменялись — сумма новых услуг. Цену не меняет.
   */
  @IsOptional()
  @IsInt()
  @Min(5, { message: 'Запись короче 5 минут' })
  @Max(MAX_DURATION_MINUTES, { message: 'Запись дольше 10 часов — разбейте её на два визита' })
  duration?: number

  @IsOptional()
  @IsEnum(AppointmentStatus, { message: 'status: PLANNED | ARRIVED | DONE | CANCELLED' })
  status?: AppointmentStatus

  /**
   * Сколько клиентка заплатила, копейки. Момент оплаты ставит сервер:
   * дату клиент не присылает, иначе платёж можно задатировать.
   */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE_KOPECKS)
  paid?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string

  @IsOptional()
  @IsBoolean()
  remind?: boolean

  @IsOptional()
  @IsBoolean()
  rebook?: boolean
}

export class ListAppointmentsDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  clientId?: string

  /** Начало периода включительно. */
  @IsOptional()
  @IsISO8601({ strict: true })
  from?: string

  /** Конец периода исключительно. */
  @IsOptional()
  @IsISO8601({ strict: true })
  to?: string
}

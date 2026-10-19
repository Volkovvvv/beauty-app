import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ReminderPlanner } from '../reminders/reminder-planner.service'
import type { CreateAppointmentDto, ListAppointmentsDto, UpdateAppointmentDto } from './dto/appointment.dto'
import { MAX_DURATION_MINUTES, overlaps, type Slot } from './overlap'
import { buildSnapshot, snapshotMinutes, snapshotPrice, type ServiceSnapshot } from './services-snapshot'

const APPOINTMENT_SELECT = {
  id: true,
  clientId: true,
  startsAt: true,
  duration: true,
  services: true,
  price: true,
  note: true,
  status: true,
  paid: true,
  paidAt: true,
  confirmedAt: true,
  declinedAt: true,
  remind: true,
  rebook: true,
  createdAt: true,
  // Ушедшие напоминания о визите — приложение пишет «напоминание отправлено»
  reminders: {
    where: { sentAt: { not: null }, error: null, kind: { in: ['BEFORE_HOURS', 'BEFORE_MINUTES'] } },
    select: { sentAt: true },
    orderBy: { sentAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.AppointmentSelect

type AppointmentRow = Prisma.AppointmentGetPayload<{ select: typeof APPOINTMENT_SELECT }>

export type AppointmentView = Omit<AppointmentRow, 'reminders' | 'services'> & {
  services: ServiceSnapshot[]
  /** Когда ушло последнее напоминание о визите; null — ещё не уходило */
  remindedAt: Date | null
}

function toView({ reminders, services, ...a }: AppointmentRow): AppointmentView {
  return { ...a, services: services as unknown as ServiceSnapshot[], remindedAt: reminders[0]?.sentAt ?? null }
}

type Tx = Prisma.TransactionClient

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: ReminderPlanner,
  ) {}

  async list(masterId: string, query: ListAppointmentsDto): Promise<AppointmentView[]> {
    const range: Prisma.DateTimeFilter = {}
    if (query.from) range.gte = new Date(query.from)
    if (query.to) range.lt = new Date(query.to)

    const rows = await this.prisma.appointment.findMany({
      where: {
        masterId,
        ...(query.clientId ? { clientId: query.clientId } : {}),
        ...(query.from || query.to ? { startsAt: range } : {}),
      },
      select: APPOINTMENT_SELECT,
      orderBy: [{ startsAt: 'asc' }, { id: 'asc' }],
      skip: query.skip ?? 0,
      take: query.take ?? 100,
    })
    return rows.map(toView)
  }

  async findOne(masterId: string, id: string): Promise<AppointmentView> {
    const row = await this.prisma.appointment.findFirst({ where: { id, masterId }, select: APPOINTMENT_SELECT })
    if (!row) throw new NotFoundException('Запись не найдена')
    return toView(row)
  }

  async create(masterId: string, dto: CreateAppointmentDto): Promise<AppointmentView> {
    // Клиентка обязана быть из этого же кабинета: иначе подстановка чужого
    // clientId создала бы запись в чужом расписании.
    const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, masterId }, select: { id: true } })
    if (!client) throw new NotFoundException('Клиентка не найдена')

    const services = await this.snapshot(masterId, dto.serviceIds)
    const slot: Slot = { startsAt: new Date(dto.startsAt), duration: snapshotMinutes(services) }

    const row = await this.prisma.$transaction(async (tx) => {
      await this.assertFree(tx, masterId, slot)
      return tx.appointment.create({
        data: {
          masterId,
          clientId: client.id,
          startsAt: slot.startsAt,
          duration: slot.duration,
          services: services as unknown as Prisma.InputJsonValue,
          // Снимок цены: подъём цены в прайсе не перепишет прошлые визиты
          price: snapshotPrice(services),
          note: dto.note?.trim() || null,
          remind: dto.remind ?? true,
          rebook: dto.rebook ?? true,
        },
        select: APPOINTMENT_SELECT,
      })
    })

    // Напоминания — вторичный эффект: их сбой не отменяет запись,
    // мастер её уже видит в расписании.
    await this.safeReplan(row.id)
    return toView(row)
  }

  async update(masterId: string, id: string, dto: UpdateAppointmentDto): Promise<AppointmentView> {
    const current = await this.prisma.appointment.findFirst({
      where: { id, masterId },
      select: { id: true, startsAt: true, duration: true, price: true, paidAt: true, status: true },
    })
    if (!current) throw new NotFoundException('Запись не найдена')

    const data: Prisma.AppointmentUpdateInput = {}
    let price = current.price
    if (dto.serviceIds) {
      const services = await this.snapshot(masterId, dto.serviceIds)
      price = snapshotPrice(services)
      data.services = services as unknown as Prisma.InputJsonValue
      data.duration = snapshotMinutes(services)
      data.price = price
    }
    if (dto.startsAt !== undefined) {
      data.startsAt = new Date(dto.startsAt)
      // Перенесли — прежний ответ клиентки на напоминание больше не про этот визит
      data.confirmedAt = null
      data.declinedAt = null
    }
    if (dto.status !== undefined) data.status = dto.status
    if (dto.note !== undefined) data.note = dto.note.trim() || null
    if (dto.remind !== undefined) data.remind = dto.remind
    if (dto.rebook !== undefined) data.rebook = dto.rebook
    if (dto.paid !== undefined) {
      if (dto.paid > price) throw new BadRequestException('Оплата больше цены записи')
      data.paid = dto.paid
      // Время оплаты ставит сервер; повторная оплата не сдвигает первую дату
      data.paidAt = dto.paid > 0 ? (current.paidAt ?? new Date()) : null
    }

    const slot: Slot = {
      startsAt: dto.startsAt !== undefined ? new Date(dto.startsAt) : current.startsAt,
      duration: (data.duration as number | undefined) ?? current.duration,
    }
    const timeChanged = dto.startsAt !== undefined || dto.serviceIds !== undefined
    const status = dto.status ?? current.status

    const row = await this.prisma.$transaction(async (tx) => {
      // Отменённая запись место не занимает — её время можно не проверять
      if (timeChanged && status !== 'CANCELLED') await this.assertFree(tx, masterId, slot, id)
      return tx.appointment.update({ where: { id }, data, select: APPOINTMENT_SELECT })
    })

    // Время, статус или переключатели поменялись — прежние напоминания неверны.
    // Правка заметки и оплаты их не касается.
    if (timeChanged || dto.status !== undefined || dto.remind !== undefined || dto.rebook !== undefined) {
      await this.safeReplan(id)
    }
    return toView(row)
  }

  async remove(masterId: string, id: string): Promise<{ deleted: true }> {
    const { count } = await this.prisma.appointment.deleteMany({ where: { id, masterId } })
    if (!count) throw new NotFoundException('Запись не найдена')
    return { deleted: true }
  }

  /** Снимок выбранных услуг из действующего прайса мастера. */
  private async snapshot(masterId: string, ids: string[]): Promise<ServiceSnapshot[]> {
    const priceList = await this.prisma.service.findMany({
      where: { masterId, id: { in: ids }, archivedAt: null },
      select: { id: true, name: true, minutes: true, price: true, cost: true },
    })
    const services = buildSnapshot(ids, priceList)
    // Чужая, убранная и несуществующая услуга — одинаковый ответ
    if (!services) throw new BadRequestException('Услуги нет в прайсе')
    if (snapshotMinutes(services) > MAX_DURATION_MINUTES) {
      throw new BadRequestException('Запись дольше 10 часов — разбейте её на два визита')
    }
    return services
  }

  /**
   * Время свободно, иначе 409. Внутри транзакции под advisory-локом на кабинет:
   * две записи на одно время, пришедшие одновременно, иначе обе прошли бы проверку.
   */
  private async assertFree(tx: Tx, masterId: string, slot: Slot, ignoreId?: string): Promise<void> {
    // ::text — функция возвращает void, а его драйвер Prisma разобрать не умеет
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${masterId}))::text`
    const windowStart = new Date(slot.startsAt.getTime() - MAX_DURATION_MINUTES * 60_000)
    const windowEnd = new Date(slot.startsAt.getTime() + slot.duration * 60_000)
    const nearby = await tx.appointment.findMany({
      where: {
        masterId,
        status: { not: 'CANCELLED' },
        startsAt: { gte: windowStart, lt: windowEnd },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { startsAt: true, duration: true },
    })
    if (nearby.some((a) => overlaps(a, slot))) throw new ConflictException('Это время уже занято')
  }

  private async safeReplan(id: string): Promise<void> {
    try {
      await this.reminders.replanForAppointment(id)
    } catch (e) {
      this.logger.error(`Не удалось запланировать напоминания: ${(e as Error).message}`)
    }
  }
}

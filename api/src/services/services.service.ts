import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto'

const SERVICE_SELECT = {
  id: true,
  name: true,
  minutes: true,
  price: true,
  category: true,
  online: true,
  sort: true,
} satisfies Prisma.ServiceSelect

export type ServiceView = Prisma.ServiceGetPayload<{ select: typeof SERVICE_SELECT }>

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Действующий прайс в порядке, который выбрал мастер. */
  list(masterId: string): Promise<ServiceView[]> {
    return this.prisma.service.findMany({
      where: { masterId, archivedAt: null },
      select: SERVICE_SELECT,
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async create(masterId: string, dto: CreateServiceDto): Promise<ServiceView> {
    // Новая услуга встаёт в конец прайса
    const last = await this.prisma.service.aggregate({ where: { masterId, archivedAt: null }, _max: { sort: true } })
    return this.prisma.service.create({
      data: { masterId, ...dto, name: dto.name.trim(), sort: (last._max.sort ?? -1) + 1 },
      select: SERVICE_SELECT,
    })
  }

  async update(masterId: string, id: string, dto: UpdateServiceDto): Promise<ServiceView> {
    await this.assertOwned(masterId, id)
    return this.prisma.service.update({
      where: { id },
      data: { ...dto, ...(dto.name !== undefined ? { name: dto.name.trim() } : {}) },
      select: SERVICE_SELECT,
    })
  }

  /**
   * Убрать из прайса. Не удаление: старые записи хранят снимок услуги
   * и от строки не зависят, но в истории изменений прайса она полезна.
   */
  async archive(masterId: string, id: string): Promise<{ archived: true }> {
    await this.assertOwned(masterId, id)
    await this.prisma.service.update({ where: { id }, data: { archivedAt: new Date() } })
    return { archived: true }
  }

  private async assertOwned(masterId: string, id: string): Promise<void> {
    const found = await this.prisma.service.findFirst({ where: { id, masterId, archivedAt: null }, select: { id: true } })
    // Чужая и несуществующая услуга дают одинаковый 404
    if (!found) throw new NotFoundException('Услуга не найдена')
  }
}

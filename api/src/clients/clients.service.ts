import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { defaultRepeatWeeks } from '../specialties/specialties'
import type { CreateClientDto, UpdateClientDto } from './dto/client.dto'
import type { AddPhotoDto } from './dto/photo.dto'
import { MAX_PHOTO_BYTES, matchesMime } from './photo-signature'

/**
 * Поля, которые уходят клиенту. Явный select: новое внутреннее поле
 * не утечёт в API само. userId наружу не идёт — только username,
 * чтобы мастер мог открыть чат с клиенткой.
 */
const CLIENT_SELECT = {
  id: true,
  name: true,
  repeatWeeks: true,
  shape: true,
  likes: true,
  allergy: true,
  payment: true,
  note: true,
  inviteStatus: true,
  createdAt: true,
  user: { select: { username: true } },
  photos: { select: { id: true, label: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.ClientSelect

type ClientRow = Prisma.ClientGetPayload<{ select: typeof CLIENT_SELECT }>

export type ClientView = Omit<ClientRow, 'user'> & {
  /** Username в Telegram — есть, только если клиентка подключилась к боту. */
  username: string | null
}

function toView({ user, ...client }: ClientRow): ClientView {
  return { ...client, username: user?.username ?? null }
}

// Пустая строка из формы — «стереть поле»
const clean = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() || null)

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Каждый метод принимает masterId первым аргументом и подставляет его в where:
   * подстановка чужого UUID в URL не отдаст чужую карточку.
   */

  async list(masterId: string, skip = 0, take = 100): Promise<ClientView[]> {
    const rows = await this.prisma.client.findMany({
      where: { masterId },
      select: CLIENT_SELECT,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip,
      take,
    })
    return rows.map(toView)
  }

  async findOne(masterId: string, id: string): Promise<ClientView> {
    const row = await this.prisma.client.findFirst({ where: { id, masterId }, select: CLIENT_SELECT })
    // Чужая и несуществующая карточка дают одинаковый 404
    if (!row) throw new NotFoundException('Клиентка не найдена')
    return toView(row)
  }

  async create(masterId: string, dto: CreateClientDto): Promise<ClientView> {
    // Не указан интервал — обычный для направления мастера: волосы раз в полтора месяца, ногти раз в три недели
    const master = dto.repeatWeeks ? null : await this.prisma.master.findUnique({ where: { id: masterId }, select: { specialties: true } })
    const row = await this.prisma.client.create({
      data: {
        masterId,
        name: dto.name.trim(),
        repeatWeeks: dto.repeatWeeks ?? defaultRepeatWeeks(master?.specialties ?? []),
        shape: clean(dto.shape),
        likes: clean(dto.likes),
        allergy: clean(dto.allergy),
        payment: clean(dto.payment),
        note: clean(dto.note),
      },
      select: CLIENT_SELECT,
    })
    return toView(row)
  }

  async update(masterId: string, id: string, dto: UpdateClientDto): Promise<ClientView> {
    await this.assertOwned(masterId, id)
    const row = await this.prisma.client.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        repeatWeeks: dto.repeatWeeks,
        shape: clean(dto.shape),
        likes: clean(dto.likes),
        allergy: clean(dto.allergy),
        payment: clean(dto.payment),
        note: clean(dto.note),
      },
      select: CLIENT_SELECT,
    })
    return toView(row)
  }

  /** Удаление вместе с записями и фото (каскад в схеме). */
  async remove(masterId: string, id: string): Promise<{ deleted: true }> {
    await this.assertOwned(masterId, id)
    await this.prisma.client.delete({ where: { id } })
    return { deleted: true }
  }

  async addPhoto(masterId: string, clientId: string, dto: AddPhotoDto): Promise<{ id: string; label: string; createdAt: Date }> {
    await this.assertOwned(masterId, clientId)
    const data = Buffer.from(dto.data, 'base64')
    if (data.length > MAX_PHOTO_BYTES) throw new BadRequestException('Фото больше 1,5 МБ — сожмите его')
    if (!matchesMime(data, dto.mime)) throw new BadRequestException('Файл не похож на картинку')

    return this.prisma.clientPhoto.create({
      data: { clientId, masterId, label: dto.label.trim(), mime: dto.mime, data },
      select: { id: true, label: true, createdAt: true },
    })
  }

  async photo(masterId: string, clientId: string, photoId: string): Promise<{ mime: string; data: Uint8Array }> {
    const photo = await this.prisma.clientPhoto.findFirst({
      where: { id: photoId, clientId, masterId },
      select: { mime: true, data: true },
    })
    if (!photo) throw new NotFoundException('Фото не найдено')
    return photo
  }

  async removePhoto(masterId: string, clientId: string, photoId: string): Promise<{ deleted: true }> {
    const { count } = await this.prisma.clientPhoto.deleteMany({ where: { id: photoId, clientId, masterId } })
    if (!count) throw new NotFoundException('Фото не найдено')
    return { deleted: true }
  }

  private async assertOwned(masterId: string, id: string): Promise<void> {
    const found = await this.prisma.client.findFirst({ where: { id, masterId }, select: { id: true } })
    if (!found) throw new NotFoundException('Клиентка не найдена')
  }
}

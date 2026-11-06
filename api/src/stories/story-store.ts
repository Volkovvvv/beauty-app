import { randomBytes } from 'node:crypto'
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

/** Сколько картинка доступна по ссылке: Telegram забирает её сразу после shareToStory. */
export const STORY_TTL_MS = 15 * 60_000
/** Сколько свежих картинок держим на мастера — старые вытесняются. */
export const PER_MASTER = 3

/** Id в ссылке: 128 случайных бит — ссылку не угадать, хотя она и открыта без входа. */
export const newStoryId = (): string => randomBytes(16).toString('hex')

/**
 * Картинки сторис. В базе, а не в памяти процесса: Telegram может забрать
 * картинку с другого экземпляра API, чем тот, что её принял.
 */
@Injectable()
export class StoryStore {
  constructor(private readonly prisma: PrismaService) {}

  async put(masterId: string, data: Buffer, now = new Date()): Promise<string> {
    const id = newStoryId()
    await this.prisma.$transaction(async (tx) => {
      // Заодно чистим просроченные у всех: отдельная уборка по расписанию не нужна
      await tx.storyImage.deleteMany({ where: { expiresAt: { lte: now } } })
      const older = await tx.storyImage.findMany({
        where: { masterId },
        orderBy: { createdAt: 'desc' },
        skip: PER_MASTER - 1,
        select: { id: true },
      })
      if (older.length) await tx.storyImage.deleteMany({ where: { id: { in: older.map((o) => o.id) } } })
      await tx.storyImage.create({ data: { id, masterId, data: new Uint8Array(data), expiresAt: new Date(now.getTime() + STORY_TTL_MS) } })
    })
    return id
  }

  async get(id: string, now = new Date()): Promise<Buffer | null> {
    const row = await this.prisma.storyImage.findFirst({ where: { id, expiresAt: { gt: now } }, select: { data: true } })
    return row ? Buffer.from(row.data) : null
  }
}

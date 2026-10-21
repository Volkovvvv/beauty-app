import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ReminderPlanner } from '../reminders/reminder-planner.service'
import { starterServices } from '../specialties/specialties'
import type { UpdateMasterDto } from './dto/update-master.dto'

const MASTER_SELECT = {
  displayName: true,
  specialties: true,
  onboardedAt: true,
  dayStart: true,
  dayEnd: true,
  notifyBeforeHours: true,
  notifyBeforeMinutes: true,
  user: { select: { firstName: true, lastName: true, username: true, timezone: true } },
} satisfies Prisma.MasterSelect

type MasterRow = Prisma.MasterGetPayload<{ select: typeof MASTER_SELECT }>

/** Профиль кабинета, как его видит мини-апп. */
export interface MasterView {
  displayName: string | null
  specialties: string[]
  /** null — мастер ещё не выбрал специализации, приложение покажет выбор */
  onboardedAt: Date | null
  /** Имя из Telegram — подсказка, пока displayName не задан. */
  telegramName: string
  /** Ник в Telegram без @ — подпись «пиши в директ» в сторис */
  username: string | null
  timezone: string
  dayStart: number
  dayEnd: number
  notifyBeforeHours: number
  notifyBeforeMinutes: number
}

function toView({ user, ...profile }: MasterRow): MasterView {
  return {
    ...profile,
    telegramName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    username: user.username,
    timezone: user.timezone,
  }
}

@Injectable()
export class MastersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: ReminderPlanner,
  ) {}

  async get(masterId: string): Promise<MasterView> {
    const row = await this.prisma.master.findUnique({ where: { id: masterId }, select: MASTER_SELECT })
    if (!row) throw new NotFoundException('Кабинет не найден')
    return toView(row)
  }

  async update(masterId: string, dto: UpdateMasterDto): Promise<MasterView> {
    const current = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { dayStart: true, dayEnd: true, specialties: true, onboardedAt: true },
    })
    if (!current) throw new NotFoundException('Кабинет не найден')
    if ((dto.dayStart ?? current.dayStart) >= (dto.dayEnd ?? current.dayEnd)) {
      throw new BadRequestException('Рабочий день должен заканчиваться позже, чем начинается')
    }

    const { onboarded, displayName, specialties, ...rest } = dto
    // Порядок выбора сохраняем, повторы отбрасываем: первая — «основная»
    const nextSpecialties = specialties ? [...new Set(specialties)] : undefined
    const added = nextSpecialties?.filter((id) => !current.specialties.includes(id)) ?? []

    const row = await this.prisma.$transaction(async (tx) => {
      // Новое направление приносит свой стартовый прайс. Убранное прайс не трогает:
      // мастер мог переименовать и перецениться — молча удалять его услуги нельзя
      if (added.length) {
        const existing = await tx.service.findMany({ where: { masterId, archivedAt: null }, select: { name: true } })
        const last = await tx.service.aggregate({ where: { masterId, archivedAt: null }, _max: { sort: true } })
        const start = (last._max.sort ?? -1) + 1
        await tx.service.createMany({
          data: starterServices(added, existing.map((s) => s.name)).map((s, i) => ({ masterId, ...s, sort: start + i })),
        })
      }
      return tx.master.update({
        where: { id: masterId },
        data: {
          ...rest,
          ...(displayName !== undefined ? { displayName: displayName.trim() } : {}),
          ...(nextSpecialties ? { specialties: nextSpecialties } : {}),
          // Дата фиксирует первое прохождение: повторный onboarded её не сдвигает
          ...(onboarded && !current.onboardedAt ? { onboardedAt: new Date() } : {}),
        },
        select: MASTER_SELECT,
      })
    })

    // Сменились интервалы напоминаний — уже поставленные визиты должны о них узнать
    if (dto.notifyBeforeHours !== undefined || dto.notifyBeforeMinutes !== undefined) {
      await this.reminders.replanForMaster(masterId)
    }
    return toView(row)
  }
}

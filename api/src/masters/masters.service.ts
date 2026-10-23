import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { ReminderPlanner } from '../reminders/reminder-planner.service'
import type { OnboardingDto } from './dto/onboarding.dto'
import type { UpdateMasterDto } from './dto/update-master.dto'
import { InstagramError, normalizeInstagram } from './instagram'

const MASTER_SELECT = {
  displayName: true,
  address: true,
  instagram: true,
  specialties: true,
  onboardedAt: true,
  dayStart: true,
  dayEnd: true,
  workDays: true,
  notifyBeforeHours: true,
  notifyBeforeMinutes: true,
  user: { select: { firstName: true, lastName: true, username: true, timezone: true } },
} satisfies Prisma.MasterSelect

type MasterRow = Prisma.MasterGetPayload<{ select: typeof MASTER_SELECT }>

/** Профиль кабинета, как его видит мини-апп. */
export interface MasterView {
  displayName: string | null
  address: string | null
  /** Ник без @ */
  instagram: string | null
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
  /** Рабочие дни недели, 0 — понедельник */
  workDays: number[]
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

// Порядок выбора сохраняем, повторы отбрасываем: первая — «основная»
const uniq = <T>(list: readonly T[]): T[] => [...new Set(list)]

/** Пустая строка в форме — «поле очистили» */
const optionalText = (raw: string | undefined): string | null | undefined =>
  raw === undefined ? undefined : raw.trim() || null

function instagramOf(raw: string | undefined): string | null | undefined {
  if (raw === undefined) return undefined
  try {
    return normalizeInstagram(raw)
  } catch (e) {
    if (e instanceof InstagramError) throw new BadRequestException(e.message)
    throw e
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
      select: { dayStart: true, dayEnd: true },
    })
    if (!current) throw new NotFoundException('Кабинет не найден')
    if ((dto.dayStart ?? current.dayStart) >= (dto.dayEnd ?? current.dayEnd)) {
      throw new BadRequestException('Рабочий день должен заканчиваться позже, чем начинается')
    }

    const { displayName, address, instagram, specialties, workDays, ...rest } = dto
    // Сферы меняют подписи и подсказки, но не услуги: прайс мастер правит сам
    const row = await this.prisma.master.update({
      where: { id: masterId },
      data: {
        ...rest,
        ...(displayName !== undefined ? { displayName: displayName.trim() } : {}),
        // undefined Prisma пропускает: поле не прислали — не трогаем
        address: optionalText(address),
        instagram: instagramOf(instagram),
        ...(specialties ? { specialties: uniq(specialties) } : {}),
        ...(workDays ? { workDays: uniq(workDays).sort((x, y) => x - y) } : {}),
      },
      select: MASTER_SELECT,
    })

    // Сменились интервалы напоминаний — уже поставленные визиты должны о них узнать
    if (dto.notifyBeforeHours !== undefined || dto.notifyBeforeMinutes !== undefined) {
      await this.reminders.replanForMaster(masterId)
    }
    return toView(row)
  }

  /**
   * Знакомство: о мастере, сферы и услуги одной транзакцией — кабинет
   * не остаётся «наполовину настроенным», если запрос оборвался.
   * Пройти второй раз нельзя: дальше всё правится в профиле и «Моих услугах».
   */
  async onboard(masterId: string, dto: OnboardingDto): Promise<MasterView> {
    const specialties = uniq(dto.specialties)
    const foreign = dto.services.find((svc) => !specialties.includes(svc.category))
    if (foreign) throw new BadRequestException(`Услуга «${foreign.name.trim()}» в сфере, которую вы не выбрали`)
    const services = dto.services.map((svc, sort) => ({ ...svc, name: svc.name.trim(), sort }))
    if (services.some((svc) => !svc.name)) throw new BadRequestException('У услуги нет названия')

    const data = {
      displayName: dto.displayName.trim(),
      address: optionalText(dto.address) ?? null,
      instagram: instagramOf(dto.instagram) ?? null,
      specialties,
    }
    if (!data.displayName) throw new BadRequestException('Как вас зовут?')

    return this.prisma.$transaction(async (tx) => {
      // Условие в самом update: два одновременных запроса не заведут услуги дважды
      const { count } = await tx.master.updateMany({
        where: { id: masterId, onboardedAt: null },
        data: { ...data, onboardedAt: new Date() },
      })
      if (!count) throw new ConflictException('Знакомство уже пройдено — услуги правятся в профиле')
      await tx.service.createMany({ data: services.map((svc) => ({ masterId, ...svc })) })
      const row = await tx.master.findUniqueOrThrow({ where: { id: masterId }, select: MASTER_SELECT })
      return toView(row)
    })
  }
}

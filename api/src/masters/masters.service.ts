import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { BotService } from '../bot/bot.service'
import { PrismaService } from '../prisma/prisma.service'
import { ReminderPlanner } from '../reminders/reminder-planner.service'
import type { OnboardingDto } from './dto/onboarding.dto'
import type { UpdateMasterDto } from './dto/update-master.dto'
import { dateTime, rubles, toCsv } from './export-csv'
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
  user: {
    select: {
      firstName: true,
      lastName: true,
      username: true,
      timezone: true,
      // Этот человек — чья-то клиентка: мини-апп не будет сразу звать её в мастера
      clientCards: {
        select: { master: { select: { displayName: true, user: { select: { firstName: true } } } } },
        orderBy: { createdAt: 'asc' },
        take: 3,
      },
    },
  },
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
  /** Имена мастеров, у которых этот человек записан клиенткой */
  clientOf: string[]
}

function toView({ user, ...profile }: MasterRow): MasterView {
  return {
    ...profile,
    telegramName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    username: user.username,
    timezone: user.timezone,
    clientOf: user.clientCards.map((c) => c.master.displayName ?? c.master.user.firstName),
  }
}

/** Пояс, который знает Intl: иначе бот не сможет написать время */
function validTimezone(raw: string): boolean {
  try {
    new Intl.DateTimeFormat('ru-RU', { timeZone: raw })
    return true
  } catch {
    return false
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
    private readonly bot: BotService,
  ) {}

  async get(masterId: string): Promise<MasterView> {
    const row = await this.prisma.master.findUnique({ where: { id: masterId }, select: MASTER_SELECT })
    if (!row) throw new NotFoundException('Кабинет не найден')
    return toView(row)
  }

  /**
   * Все клиентки и записи мастера — двумя CSV в его чат с ботом.
   * Это страховка от страха «всё пропадёт»: копия лежит у мастера на руках.
   */
  async exportToChat(masterId: string): Promise<{ sent: true; clients: number; appointments: number }> {
    const master = await this.prisma.master.findUnique({
      where: { id: masterId },
      select: { user: { select: { tgId: true, timezone: true } } },
    })
    if (!master) throw new NotFoundException('Кабинет не найден')
    const { tgId, timezone } = master.user

    const [clients, appointments] = await Promise.all([
      this.prisma.client.findMany({
        where: { masterId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, shape: true, likes: true, allergy: true, payment: true, note: true, repeatWeeks: true, createdAt: true },
      }),
      this.prisma.appointment.findMany({
        where: { masterId },
        orderBy: { startsAt: 'asc' },
        select: { clientId: true, startsAt: true, duration: true, services: true, price: true, paid: true, note: true, status: true, client: { select: { name: true } } },
      }),
    ])

    const visits = new Map<string, { count: number; last: Date }>()
    for (const a of appointments) {
      if (a.status !== 'DONE' && a.status !== 'ARRIVED') continue
      const v = visits.get(a.clientId)
      visits.set(a.clientId, { count: (v?.count ?? 0) + 1, last: !v || a.startsAt > v.last ? a.startsAt : v.last })
    }

    const clientsCsv = toCsv(
      ['Имя', 'Форма', 'Что любит', 'Аллергия', 'Оплата', 'Заметка', 'Ходит раз в (недель)', 'Визитов', 'Последний визит', 'Добавлена'],
      clients.map((c) => {
        const v = visits.get(c.id)
        return [c.name, c.shape, c.likes, c.allergy, c.payment, c.note, c.repeatWeeks, v?.count ?? 0, v ? dateTime(v.last, timezone).date : '', dateTime(c.createdAt, timezone).date]
      }),
    )

    const STATUS: Record<string, string> = { PLANNED: 'Запланирована', ARRIVED: 'Пришла', DONE: 'Проведена', CANCELLED: 'Отменена' }
    const appointmentsCsv = toCsv(
      ['Дата', 'Время', 'Клиентка', 'Услуги', 'Минут', 'Цена, ₽', 'Оплачено, ₽', 'Долг, ₽', 'Статус', 'Заметка'],
      appointments.map((a) => {
        const when = dateTime(a.startsAt, timezone)
        const names = Array.isArray(a.services) ? (a.services as { name?: string }[]).map((x) => x.name).filter(Boolean).join(' + ') : ''
        const debt = a.status === 'CANCELLED' ? 0 : Math.max(a.price - a.paid, 0)
        return [when.date, when.time, a.client.name, names, a.duration, rubles(a.price), rubles(a.paid), rubles(debt), STATUS[a.status] ?? a.status, a.note]
      }),
    )

    const day = dateTime(new Date(), timezone).date.replace(/\./g, '-')
    const first = await this.bot.sendDocument(tgId, `клиентки_${day}.csv`, clientsCsv, 'Ваши клиентки. Откройте в Excel или Google Таблицах')
    const second = first.ok ? await this.bot.sendDocument(tgId, `записи_${day}.csv`, appointmentsCsv, 'Все ваши записи') : first
    if (!second.ok) {
      throw new BadRequestException(
        first.blocked || second.blocked
          ? 'Бот не может написать вам: откройте чат с ботом и нажмите «Начать»'
          : 'Не удалось отправить файлы в Telegram. Попробуйте ещё раз',
      )
    }
    return { sent: true, clients: clients.length, appointments: appointments.length }
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

    const { displayName, address, instagram, specialties, workDays, timezone, ...rest } = dto
    if (timezone !== undefined && !validTimezone(timezone)) throw new BadRequestException('Неизвестный часовой пояс')
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
        // Пояс хранится у пользователя: в нём же бот пишет время клиенткам
        ...(timezone !== undefined ? { user: { update: { timezone } } } : {}),
      },
      select: MASTER_SELECT,
    })

    // Сменились интервалы или пояс — уже поставленные визиты должны о них узнать:
    // тихие часы считаются в поясе мастера
    if (dto.notifyBeforeHours !== undefined || dto.notifyBeforeMinutes !== undefined || timezone !== undefined) {
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

import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { ReminderPlanner } from '../reminders/reminder-planner.service'
import { generateInviteCode, isValidInviteCodeFormat } from './invite-code'
import { inviteMessage } from './invite-message'

/** Срок жизни приглашения. */
const INVITE_TTL_HOURS = 72

export interface InviteView {
  code: string
  link: string
  expiresAt: Date
  /** Готовый текст для отправки клиентке. */
  message: string
}

/** Результат привязки клиентки к боту — для нужд бота, не для API. */
export interface AcceptResult {
  clientId: string
  clientName: string
}

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name)
  private readonly botUsername: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly reminders: ReminderPlanner,
    config: ConfigService,
  ) {
    // Убираем @, если он попал в переменную: ссылка t.me/@bot ведёт в никуда
    this.botUsername = (config.get<string>('BOT_USERNAME') ?? '').replace(/^@/, '')
  }

  /**
   * Создаёт приглашение. Старые неиспользованные коды гасятся: иначе у клиентки
   * копится набор действующих ссылок, каждая из которых — секрет.
   */
  async create(masterId: string, clientId: string): Promise<InviteView> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, masterId },
      select: { id: true, name: true, userId: true, master: { select: { displayName: true, user: { select: { firstName: true } } } } },
    })
    if (!client) throw new NotFoundException('Клиентка не найдена')
    if (client.userId) throw new ConflictException('Клиентка уже подключена к боту')

    const code = generateInviteCode()
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000)

    await this.prisma.$transaction([
      this.prisma.invite.updateMany({ where: { clientId, usedAt: null }, data: { expiresAt: new Date(0) } }),
      this.prisma.invite.create({ data: { code, clientId, expiresAt } }),
      this.prisma.client.update({ where: { id: clientId }, data: { inviteStatus: 'INVITED' } }),
    ])

    const link = `https://t.me/${this.botUsername}?start=${code}`
    return {
      code,
      link,
      expiresAt,
      message: inviteMessage({
        clientName: client.name,
        masterName: client.master.displayName ?? client.master.user.firstName,
        link,
      }),
    }
  }

  /**
   * Привязывает аккаунт Telegram к карточке по коду из /start. Вызывается ботом,
   * то есть по данным от произвольного человека. null при любой проблеме: бот
   * отвечает одинаково, чтобы по ответу нельзя было подбирать ссылки.
   */
  async accept(
    rawCode: string,
    tg: { id: number; firstName: string; lastName?: string; username?: string },
  ): Promise<AcceptResult | null> {
    if (!isValidInviteCodeFormat(rawCode)) {
      this.logger.warn('Отклонён /start: некорректная форма кода')
      return null
    }

    const invite = await this.prisma.invite.findUnique({
      where: { code: rawCode },
      select: { id: true, usedAt: true, expiresAt: true, client: { select: { id: true, name: true, userId: true } } },
    })
    if (!invite || invite.usedAt || invite.expiresAt <= new Date() || invite.client.userId) {
      this.logger.warn('Отклонён /start: код не найден, использован, просрочен или карточка занята')
      return null
    }

    // Аккаунт, карточка и гашение кода — одной транзакцией: иначе сбой посередине
    // оставил бы код использованным, а клиентку неподключённой.
    try {
      await this.prisma.$transaction(async (tx) => {
        const profile = { firstName: tg.firstName, lastName: tg.lastName ?? null, username: tg.username ?? null }
        const user = await tx.user.upsert({
          where: { tgId: BigInt(tg.id) },
          update: profile,
          create: { tgId: BigInt(tg.id), ...profile },
        })
        await tx.client.update({ where: { id: invite.client.id }, data: { userId: user.id, inviteStatus: 'ACCEPTED' } })
        // Условие usedAt: null — защита от гонки двух одновременных /start
        const used = await tx.invite.updateMany({ where: { id: invite.id, usedAt: null }, data: { usedAt: new Date() } })
        if (used.count === 0) throw new ConflictException('Код уже использован')
      })
    } catch (e) {
      // Сюда же попадает @@unique([masterId, userId]): человек уже заведён у мастера другой карточкой
      this.logger.warn(`Не удалось привязать клиентку: ${(e as Error).message}`)
      return null
    }

    // Записи, поставленные до подключения, остались без напоминаний. Сбой не отменяет привязку
    try {
      await this.reminders.replanForClient(invite.client.id)
    } catch (e) {
      this.logger.error(`Напоминания после подключения не запланированы: ${(e as Error).message}`)
    }

    return { clientId: invite.client.id, clientName: invite.client.name.split(' ')[0] }
  }

  /** Отзыв приглашения: ссылка перестаёт работать сразу. */
  async revoke(masterId: string, clientId: string): Promise<{ revoked: number }> {
    const client = await this.prisma.client.findFirst({ where: { id: clientId, masterId }, select: { id: true } })
    if (!client) throw new NotFoundException('Клиентка не найдена')

    const [revoked] = await this.prisma.$transaction([
      this.prisma.invite.updateMany({ where: { clientId, usedAt: null }, data: { expiresAt: new Date(0) } }),
      this.prisma.client.updateMany({ where: { id: clientId, inviteStatus: 'INVITED' }, data: { inviteStatus: 'NONE' } }),
    ])
    return { revoked: revoked.count }
  }
}

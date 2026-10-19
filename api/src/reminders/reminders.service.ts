import { Injectable, Logger } from '@nestjs/common'
import { snapshotTitle, type ServiceSnapshot } from '../appointments/services-snapshot'
import { BotService } from '../bot/bot.service'
import { PrismaService } from '../prisma/prisma.service'
import { isCorrection } from '../specialties/specialties'
import { rebookText, visitReminderText } from './messages'

/** Сколько напоминаний берём за один тик. Защита от долгого цикла. */
const BATCH_SIZE = 100
/** Сеть моргнула — повторим; Telegram отказал навсегда — остановимся. */
const MAX_ATTEMPTS = 3
/** Сервис лежал сутки — «запись через 2 часа» про прошедший визит хуже, чем молчание. */
const STALE_AFTER_MS = 2 * 3_600_000

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly bot: BotService,
  ) {}

  /**
   * Отправляет напоминания, которым пришло время. Каждое — в своём try:
   * клиентка, заблокировавшая бота, не должна останавливать рассылку остальным.
   */
  async dispatchDue(now = new Date()): Promise<{ sent: number; failed: number }> {
    const due = await this.prisma.reminder.findMany({
      where: { sentAt: null, scheduledAt: { lte: now }, attempts: { lt: MAX_ATTEMPTS } },
      select: {
        id: true,
        kind: true,
        scheduledAt: true,
        appointment: {
          select: {
            id: true,
            clientId: true,
            startsAt: true,
            status: true,
            services: true,
            client: { select: { name: true, repeatWeeks: true, user: { select: { tgId: true } } } },
            master: {
              select: {
                displayName: true,
                specialties: true,
                bannedAt: true,
                user: { select: { firstName: true, username: true, timezone: true } },
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: BATCH_SIZE,
    })

    let sent = 0
    let failed = 0

    for (const reminder of due) {
      const a = reminder.appointment
      const tgUser = a.client.user

      if (a.master.bannedAt !== null) {
        await this.close(reminder.id, 'Отменено: кабинет закрыт администратором')
        continue
      }
      if (!tgUser || a.status === 'CANCELLED') {
        await this.close(reminder.id, 'Отменено: условия изменились')
        continue
      }

      let text: string
      let buttons: { text: string; data: string }[] | undefined
      if (reminder.kind === 'REBOOK') {
        // Уже записалась снова — звать незачем
        const later = await this.prisma.appointment.count({
          where: { clientId: a.clientId, status: { not: 'CANCELLED' }, startsAt: { gt: a.startsAt } },
        })
        if (later > 0) {
          await this.close(reminder.id, 'Отменено: клиентка уже записалась')
          continue
        }
        text = rebookText({
          clientName: a.client.name.split(' ')[0],
          weeks: a.client.repeatWeeks,
          masterUsername: a.master.user.username,
          correction: isCorrection(a.master.specialties),
        })
      } else {
        // О визите, который уже не PLANNED (пришла, готово), напоминать поздно
        if (a.status !== 'PLANNED') {
          await this.close(reminder.id, 'Отменено: условия изменились')
          continue
        }
        if (now.getTime() - reminder.scheduledAt.getTime() > STALE_AFTER_MS) {
          await this.close(reminder.id, 'Пропущено: слишком поздно')
          continue
        }
        text = visitReminderText({
          clientName: a.client.name.split(' ')[0],
          masterName: a.master.displayName ?? a.master.user.firstName,
          services: snapshotTitle(a.services as unknown as ServiceSnapshot[]),
          startsAt: a.startsAt,
          timezone: a.master.user.timezone,
          now,
        })
        // Ответ кнопкой виден мастеру: «Подтвердила ✓» или сообщение об отказе
        buttons = [
          { text: 'Приду ✓', data: `ok:${a.id}` },
          { text: 'Не смогу', data: `no:${a.id}` },
        ]
      }

      const result = await this.bot.sendMessage(tgUser.tgId, text, buttons)
      if (result.ok) {
        await this.close(reminder.id)
        sent += 1
      } else {
        failed += 1
        // Заблокировала бота — повторять бессмысленно
        if (result.blocked) await this.close(reminder.id, `Заблокирован: ${result.error ?? ''}`)
        else await this.retryLater(reminder.id, result.error ?? 'Неизвестная ошибка')
      }
    }

    if (sent > 0 || failed > 0) this.logger.log(`Напоминания: отправлено ${sent}, с ошибкой ${failed}`)
    return { sent, failed }
  }

  /** sentAt заполнен — повторов не будет. note — почему закрыли без отправки */
  private async close(id: string, note?: string): Promise<void> {
    await this.prisma.reminder.update({ where: { id }, data: { sentAt: new Date(), error: note ?? null } })
  }

  private async retryLater(id: string, error: string): Promise<void> {
    await this.prisma.reminder.update({
      where: { id },
      data: { attempts: { increment: 1 }, error: error.slice(0, 500) },
    })
  }
}

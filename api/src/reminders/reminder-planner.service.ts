import { Injectable } from '@nestjs/common'
import type { ReminderKind } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { planRebook, planVisitReminders } from './schedule'

/** Насколько назад смотреть при перепланировании: дальше «позвать на коррекцию» не ждёт. */
const REBOOK_HORIZON_MS = 26 * 7 * 86_400_000

/**
 * Планирование напоминаний: когда и какие записи Reminder создать.
 *
 * Отдельно от RemindersService: тот шлёт через бота, а планировать нужно
 * и из приглашений, которыми бот сам пользуется, — вместе вышел бы цикл.
 */
@Injectable()
export class ReminderPlanner {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Создаёт напоминания для записи. Идемпотентна: @@unique([appointmentId, kind])
   * не даст создать дубль, skipDuplicates превращает повтор в пустую операцию.
   */
  async planForAppointment(appointmentId: string, now = new Date()): Promise<number> {
    const a = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        startsAt: true,
        status: true,
        remind: true,
        rebook: true,
        client: { select: { userId: true, repeatWeeks: true } },
        master: { select: { notifyBeforeHours: true, notifyBeforeMinutes: true, user: { select: { timezone: true } } } },
      },
    })
    // Клиентка не подключена к боту — писать некуда
    if (!a || !a.client.userId || a.status === 'CANCELLED') return 0
    const timezone = a.master.user.timezone

    const planned: { kind: ReminderKind; scheduledAt: Date }[] = []
    if (a.status === 'PLANNED' && a.remind) {
      planned.push(
        ...planVisitReminders(
          a.startsAt,
          { beforeHours: a.master.notifyBeforeHours, beforeMinutes: a.master.notifyBeforeMinutes },
          now,
          timezone,
        ),
      )
    }
    if (a.rebook) {
      const at = planRebook(a.startsAt, a.client.repeatWeeks, now, timezone)
      if (at) planned.push({ kind: 'REBOOK', scheduledAt: at })
    }
    if (planned.length === 0) return 0

    const result = await this.prisma.reminder.createMany({
      data: planned.map((p) => ({ appointmentId: a.id, kind: p.kind, scheduledAt: p.scheduledAt })),
      skipDuplicates: true,
    })
    return result.count
  }

  /**
   * Пересоздаёт напоминания после изменения записи. Уже отправленные не трогаем:
   * из них и состоит защита от повторной отправки.
   */
  async replanForAppointment(appointmentId: string, now = new Date()): Promise<void> {
    await this.prisma.reminder.deleteMany({ where: { appointmentId, sentAt: null } })
    await this.planForAppointment(appointmentId, now)
  }

  /** Клиентка подключилась к боту: записи, поставленные раньше, остались без напоминаний. */
  async replanForClient(clientId: string, now = new Date()): Promise<void> {
    await this.replanWhere({ clientId }, now)
  }

  /** Сменились таймзона или интервалы напоминаний мастера. */
  async replanForMaster(masterId: string, now = new Date()): Promise<void> {
    await this.replanWhere({ masterId }, now)
  }

  private async replanWhere(where: { clientId?: string; masterId?: string }, now: Date): Promise<void> {
    const list = await this.prisma.appointment.findMany({
      where: {
        ...where,
        status: { not: 'CANCELLED' },
        startsAt: { gt: new Date(now.getTime() - REBOOK_HORIZON_MS) },
      },
      select: { id: true },
    })
    for (const { id } of list) await this.replanForAppointment(id, now)
  }
}

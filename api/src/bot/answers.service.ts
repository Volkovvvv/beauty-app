import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { declinedText } from '../reminders/messages'

export type Answer = 'ok' | 'no'

export interface AnswerResult {
  /** Короткий ответ клиентке во всплывашке Telegram */
  toast: string
  /** Сообщение мастеру, если оно нужно */
  notifyMaster?: { tgId: bigint; text: string }
}

/**
 * Ответ клиентки на напоминание кнопкой «Приду» / «Не смогу».
 *
 * Кнопку жмёт произвольный человек в Telegram, поэтому запись ищется
 * вместе с его tgId: чужой id записи в callback_data ничего не изменит.
 */
@Injectable()
export class AnswersService {
  constructor(private readonly prisma: PrismaService) {}

  async answer(tgId: bigint, answer: Answer, appointmentId: string, now = new Date()): Promise<AnswerResult> {
    const a = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, client: { user: { tgId } } },
      select: {
        id: true,
        status: true,
        startsAt: true,
        client: { select: { name: true } },
        master: { select: { user: { select: { tgId: true, timezone: true } } } },
      },
    })
    // Одинаково для чужой, удалённой и прошедшей записи
    if (!a || a.status !== 'PLANNED' || a.startsAt <= now) return { toast: 'Эта запись уже неактуальна' }

    if (answer === 'ok') {
      await this.prisma.appointment.update({ where: { id: a.id }, data: { confirmedAt: now, declinedAt: null } })
      return { toast: 'Спасибо! Мастер увидит, что вы придёте' }
    }

    await this.prisma.appointment.update({ where: { id: a.id }, data: { declinedAt: now, confirmedAt: null } })
    return {
      toast: 'Передали мастеру — с вами свяжутся, чтобы перенести',
      notifyMaster: { tgId: a.master.user.tgId, text: declinedText(a.client.name, a.startsAt, a.master.user.timezone, now) },
    }
  }
}

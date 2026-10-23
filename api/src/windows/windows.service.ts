import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MAX_DAYS, type ListWindowEditsDto, type SaveWindowEditsDto } from './dto/window-edit.dto'

/** Ручная правка окон дня, как её видит мини-апп */
export interface WindowEditView {
  date: string
  add: number[]
  rem: number[]
}

// Формат проверил DTO; здесь — что такой день существует в календаре
function assertRealDate(date: string): void {
  const [y, m, d] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(y, m - 1, d))
  if (parsed.getUTCFullYear() !== y || parsed.getUTCMonth() !== m - 1 || parsed.getUTCDate() !== d) {
    throw new BadRequestException(`Нет такой даты: ${date}`)
  }
}

const normalize = (times: readonly number[]) => [...new Set(times)].sort((a, b) => a - b)

@Injectable()
export class WindowsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(masterId: string, { from, to }: ListWindowEditsDto): Promise<WindowEditView[]> {
    assertRealDate(from)
    assertRealDate(to)
    if (from > to) throw new BadRequestException('Начало периода позже конца')
    // Строки YYYY-MM-DD сравниваются как даты
    return this.prisma.windowEdit.findMany({
      where: { masterId, date: { gte: from, lte: to } },
      select: { date: true, add: true, rem: true },
      orderBy: { date: 'asc' },
      take: MAX_DAYS * 2,
    })
  }

  /** Заменяет правки перечисленных дней целиком; остальные дни не трогает */
  async save(masterId: string, { days }: SaveWindowEditsDto): Promise<WindowEditView[]> {
    const byDate = new Map<string, { add: number[]; rem: number[] }>()
    for (const day of days) {
      assertRealDate(day.date)
      const add = normalize(day.add)
      // Один и тот же час не может быть и добавлен, и убран
      const rem = normalize(day.rem).filter((t) => !add.includes(t))
      byDate.set(day.date, { add, rem })
    }

    const cleared = [...byDate].filter(([, e]) => !e.add.length && !e.rem.length).map(([date]) => date)
    const kept = [...byDate].filter(([, e]) => e.add.length || e.rem.length)

    await this.prisma.$transaction([
      this.prisma.windowEdit.deleteMany({ where: { masterId, date: { in: cleared } } }),
      ...kept.map(([date, edit]) =>
        this.prisma.windowEdit.upsert({
          where: { masterId_date: { masterId, date } },
          update: edit,
          create: { masterId, date, ...edit },
        }),
      ),
    ])
    return kept.map(([date, edit]) => ({ date, ...edit }))
  }
}

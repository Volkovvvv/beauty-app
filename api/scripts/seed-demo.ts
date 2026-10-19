/**
 * Демо-данные для локальной разработки: клиентки, история и неделя записей
 * от сегодняшней даты — чтобы экраны выглядели как в дизайне.
 *
 *   npm run seed:demo            — кабинет тестового мастера dev-входа (tgId 100000001)
 *   npm run seed:demo -- 123456  — кабинет другого tgId
 *
 * Перезаписывает клиенток и записи этого кабинета. На проде не запускать.
 */
import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from '@prisma/client'
import { starterServices } from '../src/specialties/specialties'

if (process.env.NODE_ENV === 'production') throw new Error('seed:demo только для разработки')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
const tgId = BigInt(process.argv[2] ?? 100000001)

const FEATURED = [
  { key: 'alina', name: 'Алина Морозова', repeatWeeks: 3, shape: 'Миндаль, средняя', likes: 'Нюд, кошачий глаз', allergy: 'HEMA в базе', payment: 'Перевод, без долгов' },
  { key: 'olga', name: 'Ольга Ли', repeatWeeks: 2, shape: 'Квадрат, короткая', likes: 'Гель-лак, без дизайна', payment: 'Наличные' },
  { key: 'maria', name: 'Мария Соколова', repeatWeeks: 4, shape: 'Миндаль, длинная', likes: 'Наращивание, френч', payment: 'Перевод' },
  { key: 'daria', name: 'Дарья Ким', repeatWeeks: 3, shape: 'Овал, средняя', likes: 'Пастель', payment: 'Карта' },
]
const POOL = [
  'Ирина Павлова', 'Катя Волкова', 'Нина Романова', 'Лиза Тихонова', 'Анна Белова',
  'Вера Никитина', 'Юля Шестакова', 'Света Громова', 'Полина Ковалёва', 'Таня Миронова', 'Оля Дмитриева',
]
// Обычная неделя по дням Пн…Вс: [час, минута, услуги]
const TEMPLATE: Array<Array<[number, number, string[]]>> = [
  [[10, 0, ['Гель-лак']], [13, 0, ['Наращивание']], [17, 0, ['Маникюр']]],
  [[11, 0, ['Коррекция']], [15, 0, ['Гель-лак']]],
  [[10, 0, ['Наращивание']], [14, 0, ['Педикюр']], [16, 0, ['Гель-лак']], [19, 0, ['Снятие']]],
  [[11, 0, ['Наращивание']], [14, 30, ['Гель-лак']], [17, 0, ['Маникюр']]],
  [[11, 0, ['Наращивание']], [16, 0, ['Гель-лак']]],
  [[10, 0, ['Гель-лак']], [12, 0, ['Коррекция']], [14, 0, ['Наращивание']], [17, 0, ['Дизайн']]],
  [],
]

const DAY = 86_400_000
const atLocal = (day: Date, h: number, m: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m)
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

async function main() {
  const user = await prisma.user.upsert({
    where: { tgId },
    update: {},
    create: { tgId, firstName: 'Вика', username: 'dev_master' },
  })
  const master =
    (await prisma.master.findUnique({ where: { userId: user.id } })) ??
    (await prisma.master.create({
      data: {
        userId: user.id,
        specialties: ['nails'],
        onboardedAt: new Date(),
        services: { create: starterServices(['nails'], []).map((s, sort) => ({ ...s, sort })) },
      },
    }))
  const price = await prisma.service.findMany({ where: { masterId: master.id, archivedAt: null } })
  const byName = new Map(price.map((s) => [s.name, s]))
  const snapshot = (names: string[]) =>
    names.flatMap((n) => {
      const s = byName.get(n)
      return s ? [{ id: s.id, name: s.name, minutes: s.minutes, price: s.price, cost: s.cost }] : []
    })

  await prisma.client.deleteMany({ where: { masterId: master.id } })
  const featured = new Map<string, string>()
  for (const f of FEATURED) {
    const { key, ...data } = f
    const c = await prisma.client.create({ data: { masterId: master.id, ...data } })
    featured.set(key, c.id)
  }
  const pool: string[] = []
  for (const [i, name] of POOL.entries()) {
    const c = await prisma.client.create({
      data: { masterId: master.id, name, repeatWeeks: 3 + (i % 3), shape: ['Овал, короткая', 'Миндаль, средняя', 'Квадрат, средняя'][i % 3] },
    })
    pool.push(c.id)
  }

  const rows: Prisma.AppointmentCreateManyInput[] = []
  const taken: { start: number; end: number }[] = []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const add = (startsAt: Date, names: string[], clientId: string, extra: Partial<Prisma.AppointmentCreateManyInput> = {}) => {
    const services = snapshot(names)
    const duration = services.reduce((s, x) => s + x.minutes, 0)
    const start = startsAt.getTime()
    const end = start + duration * 60_000
    if (taken.some((t) => start < t.end && t.start < end)) return
    taken.push({ start, end })
    const total = services.reduce((s, x) => s + x.price, 0)
    const past = end <= now.getTime()
    rows.push({
      masterId: master.id,
      clientId,
      startsAt,
      duration,
      services,
      price: total,
      status: past ? 'DONE' : 'PLANNED',
      paid: past ? total : 0,
      paidAt: past ? new Date(end) : null,
      ...extra,
    })
  }

  // Сегодня: «следующая» — в ближайшие полчаса, но день не уезжает за 21:00
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const anchor = Math.min(Math.max(Math.ceil(nowMin / 30) * 30, 12 * 60), 13 * 60 + 30)
  const at = (min: number) => atLocal(today, Math.floor(min / 60), min % 60)
  add(at(anchor - 120), ['Маникюр', 'Гель-лак'], featured.get('olga')!)
  add(at(anchor), ['Коррекция', 'Дизайн'], featured.get('alina')!, { note: '«кошачий глаз»', confirmedAt: new Date() })
  add(at(anchor + 270), ['Наращивание'], featured.get('maria')!, { note: 'миндаль' })
  add(at(anchor + 420), ['Педикюр'], featured.get('daria')!, { confirmedAt: new Date() })

  // История постоянных клиенток
  for (let k = 1; k <= 13; k += 1) add(atLocal(addDays(today, -21 * k), 12, 0), ['Коррекция', 'Дизайн'], featured.get('alina')!)
  add(atLocal(addDays(today, 21), 12, 0), ['Коррекция', 'Дизайн'], featured.get('alina')!, { note: '«кошачий глаз»' })
  for (let k = 1; k <= 5; k += 1) add(atLocal(addDays(today, -14 * k), 10, 0), ['Маникюр', 'Гель-лак'], featured.get('olga')!)
  add(atLocal(addDays(today, -33), 16, 30), ['Наращивание'], featured.get('maria')!)
  // Не доплатила 1 500 ₽ — «Ждут оплаты» в «Деньгах»
  add(atLocal(addDays(today, -5), 16, 30), ['Наращивание'], featured.get('maria')!, { paid: 200_000 })
  for (let k = 0; k < 3; k += 1) add(atLocal(addDays(today, -19 - 21 * k), 19, 0), ['Педикюр'], featured.get('daria')!)

  // Остальные дни — по шаблону недели. Три последних клиентки ходили только раньше:
  // их «пора записать». Дальше текущей недели записей меньше.
  const monday = addDays(today, -((today.getDay() + 6) % 7))
  let turn = 0
  for (let d = addDays(monday, -70); d <= addDays(monday, 27); d = addDays(d, 1)) {
    if (d.getTime() === today.getTime()) continue
    for (const [i, [h, m, names]] of TEMPLATE[(d.getDay() + 6) % 7].entries()) {
      turn += 1
      if (d > addDays(monday, 6) && turn % 3 === 0) continue
      const size = d.getTime() >= today.getTime() - 28 * DAY ? pool.length - 3 : pool.length
      add(atLocal(d, h, m), names, pool[(turn * 7 + i) % size])
    }
  }

  await prisma.appointment.createMany({ data: rows })
  console.log(`Готово: ${FEATURED.length + POOL.length} клиенток, ${rows.length} записей в кабинете tgId=${tgId}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

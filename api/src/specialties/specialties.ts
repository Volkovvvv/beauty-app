/**
 * Каталог специализаций бьюти-мастеров.
 *
 * От специализации зависит не логика, а слова и стартовые данные: прайс нового
 * кабинета, через сколько недель клиентка обычно возвращается, как подписано
 * поле «особенности» в карточке и что бот пишет, когда пора записаться снова.
 * Хранится строкой, а не enum в базе: новая специализация — правка этого файла,
 * без миграции.
 */

export interface StarterService {
  name: string
  minutes: number
  /** Копейки */
  price: number
  /** Расход материалов, копейки */
  cost: number
}

export interface Specialty {
  id: string
  /** «Ногти» — как мастер выбирает себя при первом входе */
  label: string
  /** Коротко, что входит: подпись под направлением на экране выбора */
  summary: string
  services: readonly StarterService[]
  /** Обычный интервал между визитами — по умолчанию для новой клиентки */
  repeatWeeks: number
  /** Подпись поля карточки клиентки: «Форма и длина», «Тип кожи» */
  cardLabel: string
  /** К услугам этой специализации ходят на коррекцию, а не просто «снова» */
  correction: boolean
}

// Цены — ориентир по рынку, мастер правит свой прайс в приложении.
// Расход материалов — примерно десятая часть цены.
const rub = (n: number) => n * 100
const svc = (name: string, minutes: number, price: number, cost = Math.round(price / 10)): StarterService => ({
  name,
  minutes,
  price: rub(price),
  cost: rub(cost),
})

export const SPECIALTIES: readonly Specialty[] = [
  {
    id: 'nails',
    summary: 'маникюр, гель-лак, наращивание',
    label: 'Ногти',
    repeatWeeks: 3,
    cardLabel: 'Форма и длина',
    correction: true,
    services: [
      svc('Снятие', 20, 400, 30),
      svc('Маникюр', 40, 1200, 80),
      svc('Гель-лак', 60, 1600, 150),
      svc('Наращивание', 120, 3500, 400),
      svc('Коррекция', 90, 2600, 250),
      svc('Дизайн', 30, 500, 60),
      svc('Педикюр', 80, 2400, 150),
    ],
  },
  {
    id: 'brows',
    summary: 'коррекция, окрашивание, ламинирование',
    label: 'Брови',
    repeatWeeks: 4,
    cardLabel: 'Форма бровей',
    correction: true,
    services: [
      svc('Коррекция бровей', 30, 900),
      svc('Окрашивание бровей', 30, 800),
      svc('Ламинирование бровей', 60, 2200),
      svc('Перманент бровей', 150, 9000),
    ],
  },
  {
    id: 'lashes',
    summary: 'наращивание, коррекция, ламинирование',
    label: 'Ресницы',
    repeatWeeks: 3,
    cardLabel: 'Изгиб и длина',
    correction: true,
    services: [
      svc('Наращивание ресниц, классика', 120, 2800),
      svc('Наращивание ресниц, 2D', 150, 3300),
      svc('Коррекция ресниц', 90, 1800),
      svc('Снятие ресниц', 20, 400),
      svc('Ламинирование ресниц', 60, 2300),
    ],
  },
  {
    id: 'hair',
    summary: 'стрижки, окрашивание, укладки',
    label: 'Волосы',
    repeatWeeks: 6,
    cardLabel: 'Волосы',
    correction: false,
    services: [
      svc('Стрижка женская', 60, 2000),
      svc('Стрижка мужская', 40, 1200),
      svc('Окрашивание', 180, 6000),
      svc('Тонирование', 90, 3000),
      svc('Укладка', 45, 1500),
    ],
  },
  {
    id: 'makeup',
    summary: 'дневной, вечерний, свадебный',
    label: 'Макияж',
    repeatWeeks: 8,
    cardLabel: 'Тип кожи',
    correction: false,
    services: [svc('Дневной макияж', 60, 2500), svc('Вечерний макияж', 90, 3500), svc('Свадебный макияж', 120, 6000)],
  },
  {
    id: 'cosmetology',
    summary: 'чистки, пилинги, уходы',
    label: 'Косметология',
    repeatWeeks: 4,
    cardLabel: 'Тип кожи',
    correction: false,
    services: [svc('Чистка лица', 90, 3500), svc('Пилинг', 45, 2500), svc('Уход по типу кожи', 60, 3000), svc('Массаж лица', 45, 2000)],
  },
  {
    id: 'massage',
    summary: 'общий, спина, антицеллюлитный',
    label: 'Массаж',
    repeatWeeks: 1,
    cardLabel: 'Зоны и пожелания',
    correction: false,
    services: [svc('Общий массаж', 60, 3000), svc('Массаж спины', 40, 2000), svc('Антицеллюлитный массаж', 60, 3200)],
  },
  {
    id: 'depilation',
    summary: 'шугаринг и воск',
    label: 'Депиляция',
    repeatWeeks: 4,
    cardLabel: 'Зоны',
    correction: false,
    services: [svc('Шугаринг, ноги полностью', 60, 2000), svc('Шугаринг, подмышки', 20, 700), svc('Шугаринг, бикини', 40, 2200)],
  },
]

export const SPECIALTY_IDS = SPECIALTIES.map((s) => s.id)

const byId = new Map(SPECIALTIES.map((s) => [s.id, s]))

/** Специализации кабинета в порядке выбора; неизвестные id пропускаются */
export const specialtiesOf = (ids: readonly string[]): Specialty[] =>
  ids.flatMap((id) => {
    const s = byId.get(id)
    return s ? [s] : []
  })

/**
 * Стартовые услуги для новых специализаций кабинета. Услуги, которые у мастера
 * уже есть с тем же названием, не дублируются.
 */
export function starterServices(ids: readonly string[], existingNames: readonly string[]): StarterService[] {
  const taken = new Set(existingNames.map((n) => n.trim().toLowerCase()))
  const out: StarterService[] = []
  for (const s of specialtiesOf(ids)) {
    for (const service of s.services) {
      const key = service.name.toLowerCase()
      if (taken.has(key)) continue
      taken.add(key)
      out.push(service)
    }
  }
  return out
}

/** Интервал по умолчанию для новой клиентки — по первой специализации мастера */
export const defaultRepeatWeeks = (ids: readonly string[]): number => specialtiesOf(ids)[0]?.repeatWeeks ?? 4

/** «Пора на коррекцию» — только если все специализации мастера про коррекцию */
export function isCorrection(ids: readonly string[]): boolean {
  const list = specialtiesOf(ids)
  return list.length > 0 && list.every((s) => s.correction)
}

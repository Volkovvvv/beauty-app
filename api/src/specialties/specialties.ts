/**
 * Каталог специализаций (сфер) бьюти-мастеров.
 *
 * От специализации зависит не логика, а слова и подсказки: какие названия
 * услуг предложить при знакомстве, через сколько недель клиентка обычно
 * возвращается, как подписано поле «особенности» в карточке и что бот пишет,
 * когда пора записаться снова. Хранится строкой, а не enum в базе: новая
 * специализация — правка этого файла, без миграции.
 */

/** Подсказка при знакомстве: название в один тап, цену мастер вписывает сам */
export interface ServiceSuggestion {
  name: string
  minutes: number
}

export interface Specialty {
  id: string
  /** «Ногти» — как мастер выбирает сферу при знакомстве и как подписан раздел услуг */
  label: string
  /** Коротко, что входит */
  summary: string
  suggestions: readonly ServiceSuggestion[]
  /** Обычный интервал между визитами — по умолчанию для новой клиентки */
  repeatWeeks: number
  /** Подпись поля карточки клиентки: «Форма и длина», «Тип кожи» */
  cardLabel: string
  /** К услугам этой специализации ходят на коррекцию, а не просто «снова» */
  correction: boolean
}

const sug = (name: string, minutes: number): ServiceSuggestion => ({ name, minutes })

// Порядок — как на экране знакомства. «Другое» последним: без подсказок
export const SPECIALTIES: readonly Specialty[] = [
  {
    id: 'nails',
    label: 'Ногти',
    summary: 'маникюр, гель-лак, наращивание',
    repeatWeeks: 3,
    cardLabel: 'Форма и длина',
    correction: true,
    suggestions: [sug('Маникюр', 40), sug('Педикюр', 80), sug('Гель-лак', 60), sug('Наращивание', 120), sug('Снятие', 20)],
  },
  {
    id: 'brows',
    label: 'Брови и ресницы',
    summary: 'коррекция, окрашивание, наращивание',
    repeatWeeks: 4,
    cardLabel: 'Форма и изгиб',
    correction: true,
    suggestions: [sug('Коррекция бровей', 30), sug('Окрашивание', 30), sug('Ламинирование', 60), sug('Наращивание ресниц', 120)],
  },
  {
    id: 'hair',
    label: 'Волосы',
    summary: 'стрижки, окрашивание, укладки',
    repeatWeeks: 6,
    cardLabel: 'Волосы',
    correction: false,
    suggestions: [sug('Женская стрижка', 60), sug('Мужская стрижка', 40), sug('Окрашивание', 180), sug('Укладка', 45)],
  },
  {
    id: 'makeup',
    label: 'Макияж',
    summary: 'дневной, вечерний, свадебный',
    repeatWeeks: 8,
    cardLabel: 'Тип кожи',
    correction: false,
    suggestions: [sug('Дневной макияж', 60), sug('Вечерний макияж', 90), sug('Свадебный образ', 120)],
  },
  {
    id: 'cosmetology',
    label: 'Косметология',
    summary: 'чистки, пилинги, уходы',
    repeatWeeks: 4,
    cardLabel: 'Тип кожи',
    correction: false,
    suggestions: [sug('Чистка лица', 90), sug('Пилинг', 45), sug('Уходовая процедура', 60)],
  },
  {
    id: 'massage',
    label: 'Массаж',
    summary: 'классический, спина, лимфодренаж',
    repeatWeeks: 1,
    cardLabel: 'Зоны и пожелания',
    correction: false,
    suggestions: [sug('Классический массаж', 60), sug('Массаж спины', 40), sug('Лимфодренаж', 60)],
  },
  {
    id: 'depilation',
    label: 'Депиляция',
    summary: 'шугаринг, воск, лазер',
    repeatWeeks: 4,
    cardLabel: 'Зоны',
    correction: false,
    suggestions: [sug('Шугаринг', 60), sug('Восковая депиляция', 60), sug('Лазерная эпиляция', 45)],
  },
  {
    id: 'tattoo',
    label: 'Тату и пирсинг',
    summary: 'тату, пирсинг, перманент',
    repeatWeeks: 8,
    cardLabel: 'Эскиз и зона',
    correction: false,
    suggestions: [sug('Тату', 180), sug('Пирсинг', 30), sug('Перманентный макияж', 150)],
  },
  {
    id: 'other',
    label: 'Другое',
    summary: 'всё, что не подошло выше',
    repeatWeeks: 4,
    cardLabel: 'Особенности',
    correction: false,
    suggestions: [],
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

/** Интервал по умолчанию для новой клиентки — по первой специализации мастера */
export const defaultRepeatWeeks = (ids: readonly string[]): number => specialtiesOf(ids)[0]?.repeatWeeks ?? 4

/** «Пора на коррекцию» — только если все специализации мастера про коррекцию */
export function isCorrection(ids: readonly string[]): boolean {
  const list = specialtiesOf(ids)
  return list.length > 0 && list.every((s) => s.correction)
}

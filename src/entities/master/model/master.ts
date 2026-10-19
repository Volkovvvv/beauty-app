import type { Workday } from '../../appointment'

/** Направление из каталога сервера: подписи и слова зависят от него */
export interface Specialty {
  id: string
  label: string
  /** Подпись поля «особенности» в карточке клиентки */
  cardLabel: string
  /** К этим услугам ходят на коррекцию */
  correction: boolean
  repeatWeeks: number
  /** Коротко, что входит: «коррекция, окрашивание, ламинирование» */
  summary: string
}

export interface Master {
  name: string
  telegramName: string
  workday: Workday
  specialties: string[]
  onboarded: boolean
}

/** Слова, которые зависят от направлений мастера */
export interface Wording {
  /** «Форма и длина», «Тип кожи»; у нескольких разных направлений — «Особенности» */
  cardLabel: string
  /** Все направления про коррекцию — «пора на коррекцию», иначе «пора записаться снова» */
  correction: boolean
}

export function wordingFor(ids: readonly string[], catalog: readonly Specialty[]): Wording {
  const picked = catalog.filter((s) => ids.includes(s.id))
  const labels = new Set(picked.map((s) => s.cardLabel))
  return {
    cardLabel: labels.size === 1 ? [...labels][0] : 'Особенности',
    correction: picked.length > 0 && picked.every((s) => s.correction),
  }
}

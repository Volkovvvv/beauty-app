import type { Workday } from '../../appointment'

/** Подсказка при знакомстве: название в один тап, цену мастер вписывает сам */
export interface ServiceSuggestion {
  name: string
  minutes: number
}

/** Сфера из каталога сервера: подписи, слова и подсказки услуг зависят от неё */
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
  suggestions: readonly ServiceSuggestion[]
}

export interface Master {
  name: string
  telegramName: string
  /** Ник в Telegram без @, если есть */
  username: string | null
  /** Где принимает */
  address: string | null
  /** Ник в Instagram без @ */
  instagram: string | null
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

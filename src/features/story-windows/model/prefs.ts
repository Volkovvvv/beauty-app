/** Шаблоны карточки из макета StoryCard */
export type StoryTemplate = 'photo' | 'cherry' | 'cream' | 'night'

export const TEMPLATES: readonly { id: StoryTemplate; name: string; swatch: string }[] = [
  { id: 'photo', name: 'Фото', swatch: 'linear-gradient(135deg, #f1c9d1, #7a1630)' },
  { id: 'cherry', name: 'Вишня', swatch: '#7a1630' },
  { id: 'cream', name: 'Крем', swatch: '#f6eeea' },
  { id: 'night', name: 'Ночь', swatch: '#2a1a1f' },
]

// Выбор мастера переживает закрытие шторки: шаблон, фото и подпись
// редко меняются от недели к неделе. Только удобство — без хранилища всё работает.
const KEY = 'beauty-crm:story'

export interface StoryPrefs {
  template: StoryTemplate
  photo: string | null
  handle: string | null
  /** Шаг окон в сторис, часы; не выбран — по длительности услуг */
  step: StoryStep
}

/** Через сколько часов показывать окна в сторис */
export type StoryStep = 1 | 2 | 3

export const STEPS: readonly StoryStep[] = [1, 2, 3]

/**
 * Шаг по умолчанию — типичная длительность услуг мастера, округлённая до часа:
 * у бровиста час, у мастера маникюра обычно два. Без прайса — каждый час.
 */
export function defaultStep(minutes: readonly number[]): StoryStep {
  if (!minutes.length) return 1
  const sorted = [...minutes].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  return Math.min(3, Math.max(1, Math.round(median / 60))) as StoryStep
}

export function loadPrefs(): Partial<StoryPrefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<StoryPrefs>
  } catch {
    return {}
  }
}

/** Сохраняет переданные поля, остальные остаются как были */
export function savePrefs(prefs: Partial<StoryPrefs>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadPrefs(), ...prefs }))
  } catch {
    // квота (фото крупное) или приватный режим — выбор просто не запомнится
  }
}

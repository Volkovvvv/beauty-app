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
}

export function loadPrefs(): Partial<StoryPrefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<StoryPrefs>
  } catch {
    return {}
  }
}

export function savePrefs(prefs: StoryPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // квота (фото крупное) или приватный режим — выбор просто не запомнится
  }
}

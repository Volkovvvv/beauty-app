/** Шаблоны карточки из макета StoryCard */
export type StoryTemplate = 'photo' | 'cherry' | 'cream' | 'night'

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

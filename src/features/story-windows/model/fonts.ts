// Шрифты для картинки сторис. html-to-image сам перебирает все шрифты страницы
// со всеми наборами символов, а сторонний CSS Google читать не умеет — выходит
// долго и без шрифтов. Поэтому собираем CSS сами: только два семейства карточки,
// только кириллица и латиница, файлы шрифтов прямо внутри (data:).
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Manrope:wght@600;700;800&display=swap'

// Google подписывает каждый @font-face комментарием с набором символов
const SUBSETS = new Set(['cyrillic', 'latin'])

let cached: Promise<string> | null = null

/** CSS со встроенными шрифтами карточки. Пустая строка — шрифты не загрузились */
export function storyFontCSS(): Promise<string> {
  cached ??= build().catch(() => {
    cached = null
    return ''
  })
  return cached
}

async function build(): Promise<string> {
  const css = await (await fetch(FONTS_URL)).text()
  const faces = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*{[^}]*})/g)]
    .filter(([, subset]) => SUBSETS.has(subset))
    .map(([, , face]) => face)
  const inlined = await Promise.all(
    faces.map(async (face) => {
      const url = /url\((https:[^)]+)\)/.exec(face)?.[1]
      return url ? face.replace(url, await toDataUrl(url)) : face
    })
  )
  return inlined.join('\n')
}

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Шрифт не загрузился'))
    reader.readAsDataURL(blob)
  })
}

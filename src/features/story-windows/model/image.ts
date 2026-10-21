import { toCanvas } from 'html-to-image'
import { storyFontCSS } from './fonts'

// Карточка свёрстана в 360×640, сторис — 1080×1920
const PIXEL_RATIO = 3

/** Картинка сторис из свёрстанной карточки: JPEG 1080×1920 */
export async function renderStory(node: HTMLElement): Promise<Blob> {
  const fontEmbedCSS = await storyFontCSS()
  // Без своих шрифтов (нет сети до Google) картинка соберётся системными, но соберётся
  const options = { pixelRatio: PIXEL_RATIO, width: 360, height: 640, ...(fontEmbedCSS ? { fontEmbedCSS } : { skipFonts: true }) }
  // Safari рисует картинки и шрифты только со второго прохода — первый прогревает
  await toCanvas(node, options)
  const canvas = await toCanvas(node, options)
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Не удалось собрать картинку'))), 'image/jpeg', 0.92)
  )
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = () => reject(new Error('Не удалось прочитать картинку'))
    reader.readAsDataURL(blob)
  })
}

/**
 * Фон шаблона «Фото»: кадр 9:16, размытый заранее. CSS-фильтр blur Safari
 * не переносит в картинку, поэтому размываем сами — ужимаем фото
 * до пары десятков точек и растягиваем обратно со сглаживанием.
 */
export async function blurredBackground(file: File): Promise<string> {
  const image = await loadImage(file)
  const small = document.createElement('canvas')
  small.width = 27
  small.height = 48
  drawCover(small, image)

  const out = document.createElement('canvas')
  out.width = 540
  out.height = 960
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать фото')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(small, 0, 0, out.width, out.height)
  return out.toDataURL('image/jpeg', 0.85)
}

// Вписать картинку в холст с обрезкой краёв, как background-size: cover
function drawCover(canvas: HTMLCanvasElement, image: HTMLImageElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать фото')
  const scale = Math.max(canvas.width / image.width, canvas.height / image.height)
  const w = image.width * scale
  const h = image.height * scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Не удалось открыть фото'))
    }
    image.src = url
  })
}

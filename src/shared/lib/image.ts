// Фото с камеры телефона — 3–12 МБ. Для карточки клиентки столько не нужно:
// ужимаем до maxSide по длинной стороне и отдаём JPEG в base64 без префикса.
export async function fileToJpegBase64(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  const image = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(image.width * scale)
  canvas.height = Math.round(image.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Не удалось обработать фото')
  // Скриншот с прозрачным фоном в JPEG стал бы чёрным
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', quality).split(',')[1]
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

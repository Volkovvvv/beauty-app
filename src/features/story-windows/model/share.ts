import { api, API_URL } from '../../../shared/api/client'
import { canShareToStory, shareToStory } from '../../../shared/api/telegram'
import { blobToBase64, renderStory } from './image'

export type ShareResult = 'story' | 'shared' | 'downloaded'

/**
 * Отдать карточку в сторис. В Telegram — его редактором сторис: он берёт
 * картинку только по публичной ссылке, поэтому сначала кладём её на сервер.
 * Вне Telegram — системным «Поделиться» или скачиванием файла.
 */
export async function publishStory(node: HTMLElement): Promise<ShareResult> {
  const blob = await renderStory(node)

  if (canShareToStory()) {
    const { id } = await api.post<{ id: string }>('/stories', { data: await blobToBase64(blob) })
    shareToStory(`${API_URL}/stories/${id}.jpg`)
    return 'story'
  }

  const file = new File([blob], 'okoshki.jpg', { type: 'image/jpeg' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (e) {
      // Закрыла окно «Поделиться» — это не ошибка, просто ничего не делаем
      if ((e as Error).name === 'AbortError') return 'shared'
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'okoshki.jpg'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

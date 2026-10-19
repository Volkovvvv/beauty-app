import { useEffect, useState } from 'react'
import { api } from '../../../shared/api/client'
import type { WorkPhoto } from '../model/client'
import s from './WorkPhotoTile.module.css'

// Фото за авторизацией: <img src> не шлёт токен, поэтому качаем fetch'ем.
// Фото по id не меняется, так что ссылка кешируется на всё время работы приложения.
const cache = new Map<string, Promise<string>>()

function loadPhoto(clientId: string, photoId: string): Promise<string> {
  let url = cache.get(photoId)
  if (!url) {
    url = api.blob(`/clients/${clientId}/photos/${photoId}`).then((blob) => URL.createObjectURL(blob))
    // Не загрузилось — следующая попытка пойдёт на сервер заново
    url.catch(() => cache.delete(photoId))
    cache.set(photoId, url)
  }
  return url
}

// Плитка фото работы с подписью
export default function WorkPhotoTile({ clientId, photo }: { clientId: string; photo: WorkPhoto }) {
  const [src, setSrc] = useState(photo.localUrl ?? null)

  useEffect(() => {
    if (photo.localUrl) {
      setSrc(photo.localUrl)
      return undefined
    }
    let alive = true
    loadPhoto(clientId, photo.id)
      .then((url) => alive && setSrc(url))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [clientId, photo.id, photo.localUrl])

  return (
    <div className={s.photo} style={src ? { backgroundImage: `url(${src})` } : undefined}>
      <span className={s.label}>{photo.label}</span>
    </div>
  )
}

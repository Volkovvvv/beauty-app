// Тонкая обёртка над Telegram WebApp SDK.
// Вне Telegram tg === null и все вызовы становятся no-op.

// Только то, чем пользуется приложение
interface TelegramBackButton {
  show(): void
  hide(): void
  onClick(cb: () => void): void
  offClick(cb: () => void): void
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe?: { user?: { first_name?: string } }
  platform?: string
  ready(): void
  expand(): void
  setBackgroundColor?(color: string): void
  setHeaderColor?(color: string): void
  openTelegramLink?(url: string): void
  /** Bot API 7.8+: публикация сторис по публичной https-ссылке на картинку */
  shareToStory?(mediaUrl: string, params?: { text?: string }): void
  isVersionAtLeast?(version: string): boolean
  HapticFeedback?: { impactOccurred(style: 'light' | 'medium' | 'heavy'): void }
  BackButton?: TelegramBackButton
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

// Скрипт SDK подключён всегда, поэтому WebApp есть и в обычном браузере.
// Признак реального запуска из Telegram — initData или известная платформа.
export const isTelegram = Boolean(
  webApp && (webApp.initData || (webApp.platform && webApp.platform !== 'unknown'))
)

export const tg: TelegramWebApp | null = isTelegram && webApp ? webApp : null

/**
 * Подписанная строка initData для входа. Читается в момент вызова, а не при
 * импорте: на части клиентов (Telegram Desktop) WebApp заполняется не сразу.
 * Запасной путь — hash адреса: Telegram кладёт туда tgWebAppData с той же подписью.
 */
export function getInitData(): string | null {
  const fromSdk = window.Telegram?.WebApp?.initData
  if (fromSdk) return fromSdk
  try {
    return new URLSearchParams(window.location.hash.slice(1)).get('tgWebAppData')
  } catch {
    return null
  }
}

export function initTelegram(): void {
  if (!tg) return
  tg.ready()
  tg.expand()
}

// Шапку и фон за пределами webview красим в цвет приложения
export function applyTheme(): void {
  if (!tg) return
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  try {
    if (bg) {
      tg.setBackgroundColor?.(bg)
      tg.setHeaderColor?.(bg)
    }
  } catch {
    // старые клиенты метод не поддерживают — оформление останется системным
  }
}

// Имя мастера для приветствия: из Telegram, вне его — запасное
export function telegramFirstName(): string | null {
  return tg?.initDataUnsafe?.user?.first_name ?? null
}

export function haptic(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  try {
    tg?.HapticFeedback?.impactOccurred(type)
  } catch {
    // не поддерживается — игнорируем
  }
}

/**
 * Отправить текст в выбранный чат: нативный выбор чата Telegram через t.me/share.
 * Вне Telegram — копирование в буфер. 'shared' | 'copied' | 'failed'
 */
export async function shareText(text: string): Promise<'shared' | 'copied' | 'failed'> {
  if (tg?.openTelegramLink) {
    try {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(text)}`)
      return 'shared'
    } catch {
      // ниже отработает копирование
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// Открыть чат с клиенткой по username. false — написать некуда
export function openChat(username?: string | null): boolean {
  if (!username) return false
  const url = `https://t.me/${username}`
  if (tg?.openTelegramLink) tg.openTelegramLink(url)
  else window.open(url, '_blank', 'noopener')
  return true
}

/** Умеет ли этот клиент Telegram публиковать сторис из мини-аппа */
export function canShareToStory(): boolean {
  try {
    return Boolean(tg?.shareToStory && tg.isVersionAtLeast?.('7.8'))
  } catch {
    return false
  }
}

/** Открыть редактор сторис Telegram с картинкой по ссылке */
export function shareToStory(mediaUrl: string): void {
  tg?.shareToStory?.(mediaUrl)
}
